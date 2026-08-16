// server/routes/posts.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import {
  fetchLeastLikedFromDb,
  fetchMostLikedFromDb,
  hydrateSongsByIds,
  LEADERBOARD_LIMIT,
} from "../queries/leaderboard";
import {
  createSong,
  FeedSongResult,
  findLikeByUserAndSong,
  getRecommendedFeed,
  updateSongLikeCount,
  upsertLikeDislike,
} from "../queries/posts";
import {
  userPopularSongsCacheKey,
  userPostsCacheKey,
  userRecentUploadsCacheKey,
} from "../redis/keys";
import {
  ensureLeaderboardSeeded,
  zAddSongScore,
  zBottomSongs,
  zTopSongs,
} from "../redis/leaderboard";
import { delCacheItem, getCacheItem, setCacheItem } from "../redis/redis";
import { serializeRealtimeLikeCounts } from "../serializers/likeCount";
import { SerializedPost, serializePosts } from "../serializers/posts";
import { BUCKETS, createPresignedUrlWithClientPUT } from "../service/S3Service";
import { assertSafeFilename, UnsafeFilenameError } from "../util/filename";
import { moduleLogger } from "../util/logger";
import {
  broadcastLikeCountUpdate,
  notifySongLiked,
} from "../websocket/publish";

const DEFAULT_POST_LIMIT = 15;

const postsLogger = moduleLogger("posts", { devOnly: false });

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const cachedItems = await getCacheItem<SerializedPost<FeedSongResult>[]>(
    userPostsCacheKey(req.userId!),
  );
  if (cachedItems) {
    const withRealtimeCounts = await serializeRealtimeLikeCounts(cachedItems);
    return res.status(200).json(withRealtimeCounts);
  }

  postsLogger.warn("User posts cache not found, fetching posts...");

  try {
    const posts = await getRecommendedFeed(req.userId!, DEFAULT_POST_LIMIT);
    const serializedPosts = await serializePosts<FeedSongResult>(posts);
    await setCacheItem(userPostsCacheKey(req.userId!), serializedPosts);
    const withRealtimeCounts =
      await serializeRealtimeLikeCounts(serializedPosts);
    res.status(200).json(withRealtimeCounts);
  } catch (error) {
    postsLogger.error(error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/new", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const {
      description,
      title,
      key,
      tags: rawTags,
    }: {
      description: string;
      title: string;
      key: string;
      tags: string[];
    } = req.body;
    const newSong = await createSong({
      description,
      title,
      userId,
      key,
      tags: rawTags,
    });
    await zAddSongScore(newSong.id, newSong.likeCount);
    // Profile tables that include the uploader's songs must refresh.
    await delCacheItem(userRecentUploadsCacheKey(userId));
    await delCacheItem(userPopularSongsCacheKey(userId));
    // TODO: also invalidate userPostsCacheKey / other feed consumers when feed
    // freshness after upload matters. liked-songs is usually unchanged by own upload.
    res.status(200).json(newSong);
  } catch (e) {
    postsLogger.error(e);
    res.status(500).json({ error: "Failed to create new song" });
  }
});

/**
 * Generates a pre-signed url for uploading an audio file.
 */
router.post("/pre-signed-url", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const {
      filename,
      contentType,
    }: {
      filename: string;
      contentType: string;
    } = req.body;
    assertSafeFilename(filename);
    const key = `${userId}/${filename}`;
    const bucket = BUCKETS.audioFiles;
    const url = await createPresignedUrlWithClientPUT({
      bucket,
      key,
      contentType,
    });
    res.status(200).json({ objectKey: key, url });
  } catch (e) {
    postsLogger.error(e);
    if (e instanceof UnsafeFilenameError) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: "Failed to get pre-signed-url" });
  }
});

//TODO: check user's feed cache for eligibility to update
router.post("/like", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const {
      liked,
      songId,
    }: {
      songId: number;
      liked: boolean;
    } = req.body;
    if (typeof liked !== "boolean") {
      return res.status(400).json({ error: "liked must be a boolean" });
    }
    if (typeof songId !== "number") {
      return res.status(400).json({ error: "songId must be a number" });
    }
    const type = liked ? "LIKE" : "DISLIKE";
    const likeResult = await findLikeByUserAndSong(userId, songId);
    if (likeResult?.type.toUpperCase() === type) {
      throw new Error(`Song already liked: ${liked} by user: ${userId}`);
    }
    const update = await upsertLikeDislike(userId, songId, type);

    if (!update.updatedAt) {
      throw new Error("UpdatedAt is null, this should never happen");
    }

    const incrementAmount =
      update.createdAt.getTime() === update.updatedAt.getTime() ? 1 : 2;

    const song = await updateSongLikeCount(songId, liked, incrementAmount);

    await zAddSongScore(song.id, song.likeCount);

    broadcastLikeCountUpdate({
      songId: song.id,
      likeCount: song.likeCount,
      title: song.title,
      user: song.user,
    });

    if (liked && song.userId !== userId) {
      notifySongLiked(song.userId, {
        songId: song.id,
        title: song.title,
        message: `Someone liked "${song.title}"!`,
      });
    }

    res.status(200).json({ likeCount: song.likeCount });
  } catch (e) {
    postsLogger.error(e);
    res.status(500).json({ error: "Failed to process like" });
  }
});

router.get("/most-liked", async (_req, res) => {
  try {
    await ensureLeaderboardSeeded();
    const songIds = await zTopSongs(LEADERBOARD_LIMIT);
    const posts =
      songIds !== null
        ? await hydrateSongsByIds(songIds)
        : await fetchMostLikedFromDb();
    res.status(200).json(posts);
  } catch (error) {
    postsLogger.error(error);
    res.status(500).json({ error: "Failed to fetch most-liked" });
  }
});

router.get("/least-liked", async (_req, res) => {
  try {
    await ensureLeaderboardSeeded();
    const songIds = await zBottomSongs(LEADERBOARD_LIMIT);
    const posts =
      songIds !== null
        ? await hydrateSongsByIds(songIds)
        : await fetchLeastLikedFromDb();
    res.status(200).json(posts);
  } catch (error) {
    postsLogger.error(error);
    res.status(500).json({ error: "Failed to fetch least-liked" });
  }
});

export default router;
