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
  findLikeByUserAndSong,
  getRecommendedFeed,
  updateSongLikeCount,
  upsertLikeDislike,
} from "../queries/posts";
import { userPostsCacheKey } from "../redis/keys";
import {
  ensureLeaderboardSeeded,
  zAddSongScore,
  zBottomSongs,
  zTopSongs,
} from "../redis/leaderboard";
import { getCacheItem, setCacheItem } from "../redis/redis";
import {
  BUCKETS,
  createPresignedUrlWithClientGET,
  createPresignedUrlWithClientPUT,
} from "../service/S3Service";
import { assertSafeFilename, UnsafeFilenameError } from "../util/filename";
import {
  broadcastLikeCountUpdate,
  notifySongLiked,
} from "../websocket/publish";

const DEFAULT_POST_LIMIT = 15;

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const cachedItems = await getCacheItem(userPostsCacheKey(req.userId!));
  if (cachedItems) {
    return res.status(200).json(cachedItems);
  }

  console.warn("User posts cache not found, fetching posts...");

  try {
    const posts = await getRecommendedFeed(req.userId!, DEFAULT_POST_LIMIT);
    const newPosts = await Promise.all(
      posts.map(async (post) => {
        //todo: get presignedUrls from cloudfront
        //this is cheaper and faster than s3 presign urls
        const url = await createPresignedUrlWithClientGET({
          key: post.key,
          bucket: BUCKETS.audioFiles,
        });
        const newPost = {
          ...post,
          url,
          like: post.like?.toLocaleLowerCase(),
        } as any;
        delete newPost.key;
        return newPost;
      }),
    );
    await setCacheItem(userPostsCacheKey(req.userId!), newPosts);
    res.status(200).json(newPosts);
  } catch (error) {
    console.error(error);
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
    res.status(200).json(newSong);
  } catch (e) {
    console.error(e);
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
    console.error(e);
    if (e instanceof UnsafeFilenameError) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: "Failed to get pre-signed-url" });
  }
});

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
    const type = liked ? "LIKE" : ("DISLIKE" as const);
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
    console.error(e);
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
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: "Failed to fetch least-liked" });
  }
});

export default router;
