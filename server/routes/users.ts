// server/routes/users.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import config from "../config";
import {
  clearUserAvatar,
  createUser,
  findUserAvatar,
  findUserProfileByCognitoId,
  findUserTagsByCognitoId,
  getMostPopularSongs,
  getRecentlyLikedSongs,
  getRecentlyUploadedSongs,
  updateUserAvatar,
} from "../queries/users";
import {
  userLikedSongsCacheKey,
  userPopularSongsCacheKey,
  userRecentUploadsCacheKey,
} from "../redis/keys";
import { getCacheItem, setCacheItem } from "../redis/redis";
import { serializeRealtimeLikeCounts } from "../serializers/likeCount";
import { SerializedPost, serializePosts } from "../serializers/posts";
import { IdTokenClaimsPayload, verifyIdToken } from "../service/CognitoService";
import {
  createPresignedUrlWithClientPUT,
  deleteS3Object,
} from "../service/S3Service";
import { assertSafeFilename, UnsafeFilenameError } from "../util/filename";
import { moduleLogger } from "../util/logger";
import { mapTagResults } from "../util/tags";

const usersLogger = moduleLogger("users", { devOnly: false });

const router = express.Router();

router.use(cognitoAuthorizer);

/**
 * Fetch the current user's profile
 * Return null if user is not found
 */
router.get("/current", async (req: AuthenticatedRequest, res) => {
  try {
    const { cognitoId } = req;
    const user = await findUserProfileByCognitoId(cognitoId!);

    if (!user) {
      usersLogger.warn("User not found, create an new user!");
      return res.status(200).json(null);
    }

    const cacheKey = userRecentUploadsCacheKey(user.id);
    let songs = await getCacheItem<SerializedPost[]>(cacheKey);
    if (!songs) {
      songs = await serializePosts(await getRecentlyUploadedSongs(user.id));
      await setCacheItem(cacheKey, songs);
    }
    const songsWithRealtimeCounts = await serializeRealtimeLikeCounts(songs);

    const userTags = await findUserTagsByCognitoId(cognitoId!);
    const result = {
      ...user,
      songs: songsWithRealtimeCounts,
      tags: mapTagResults(userTags),
    };
    res.status(200).json(result);
  } catch (e) {
    usersLogger.error(e);
    res
      .status(500)
      .json({ error: `Failed to fetch user by id: ${req.userId}` });
  }
});

/**
 * Fetch the most popular songs uploaded by the current user
 */
router.get("/current/popular-songs", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const cacheKey = userPopularSongsCacheKey(userId);
    let songs = await getCacheItem<SerializedPost[]>(cacheKey);
    if (!songs) {
      const rawSongs = await getMostPopularSongs(userId);
      songs = await serializePosts(rawSongs);
      await setCacheItem(cacheKey, songs);
    }
    const songsWithRealtimeCounts = await serializeRealtimeLikeCounts(songs);
    res.status(200).json(songsWithRealtimeCounts);
  } catch (e) {
    usersLogger.error(e);
    res.status(500).json({ error: "Failed to fetch most popular songs" });
  }
});

/**
 * Fetch the recently liked songs for the current user
 */
router.get("/current/liked-songs", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const cacheKey = userLikedSongsCacheKey(userId);
    let songs = await getCacheItem<SerializedPost[]>(cacheKey);
    if (!songs) {
      const rawSongs = await getRecentlyLikedSongs(userId);
      songs = await serializePosts(rawSongs);
      await setCacheItem(cacheKey, songs);
    }
    const songsWithRealtimeCounts = await serializeRealtimeLikeCounts(songs);
    res.status(200).json(songsWithRealtimeCounts);
  } catch (e) {
    usersLogger.error(e);
    res.status(500).json({ error: "Failed to fetch recently liked songs" });
  }
});

/**
 * Create a new user using the sub claim as cognito id
 * This requires the id token to get name and email claims,
 * send it in the body of the request and verify separate from access token.
 */
router.post("/new", async (req, res) => {
  try {
    const { idToken }: { idToken: string } = req.body;

    const claims = (await verifyIdToken(idToken)) as IdTokenClaimsPayload;

    const { email, name, sub } = claims;
    const username = claims["cognito:username"];

    const newUser = await createUser({
      email,
      name,
      username,
      cognitoId: sub,
    });
    res.status(200).json(newUser);
  } catch (e: any) {
    usersLogger.error(e);
    if (e.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Failed to create new user" });
  }
});

/**
 * Generates a pre-signed url for uploading an avatar.
 * S3 object keys use `{cognitoId}/{filename}`.
 */
router.post(
  "/avatar/pre-signed-url",
  async (req: AuthenticatedRequest, res) => {
    const cognitoId = req.cognitoId;
    try {
      const {
        filename,
        contentType,
      }: {
        filename: string;
        contentType: string;
      } = req.body;
      assertSafeFilename(filename);
      const key = `${cognitoId}/${filename}`;
      const bucket = config.aws.bucket.images;
      const url = await createPresignedUrlWithClientPUT({
        bucket,
        key,
        contentType,
      });
      res.status(200).json({ url, objectKey: key });
    } catch (e) {
      usersLogger.error(e);
      if (e instanceof UnsafeFilenameError) {
        return res.status(400).json({ error: e.message });
      }
      res
        .status(500)
        .json({ error: "Failed to get pre-signed-url for avatar" });
    }
  },
);

/**
 * Updates avatar for a user
 */
router.post("/avatar/update", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const { key }: { key: string } = req.body;

    const nawAvatar = await updateUserAvatar(userId, key);
    res.status(200).json(nawAvatar);
  } catch (e: any) {
    usersLogger.error(e);
    res.status(500).json({ error: "Failed to update avatar" });
  }
});

/**
 * Deletes the current avatar for a user
 */
router.post("/avatar/update/delete", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  try {
    const currentUser = await findUserAvatar(userId);

    if (!currentUser?.avatar)
      throw new Error("User doesn't have an avatar to delete!");

    await deleteS3Object({
      bucket: config.aws.bucket.images,
      key: currentUser?.avatar,
    });

    const newUser = await clearUserAvatar(userId);
    res.status(200).json(newUser);
  } catch (e: any) {
    usersLogger.error(e);
    res.status(500).json({ error: "Failed to delete avatar" });
  }
});

export default router;
