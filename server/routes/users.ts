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
  updateUserAvatar,
} from "../queries/users";
import { IdTokenClaimsPayload, verifyIdToken } from "../service/CognitoService";
import {
  createPresignedUrlWithClientPUT,
  deleteS3Object,
} from "../service/S3Service";
import { assertSafeFilename, UnsafeFilenameError } from "../util/filename";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.use(cognitoAuthorizer);

//return null if user is not found
router.get("/current", async (req: AuthenticatedRequest, res) => {
  try {
    const { cognitoId } = req;
    const user = await findUserProfileByCognitoId(cognitoId!);

    if (!user) {
      console.warn("User not found, create an new user!");
      return res.status(200).json(null);
    }

    const userTags = await findUserTagsByCognitoId(cognitoId!);
    const result = { ...user, tags: mapTagResults(userTags) };
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: `Failed to fetch user by id: ${req.userId}` });
  }
});

router.get("/current/popular-songs", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const songs = await getMostPopularSongs(userId);
    res.status(200).json(songs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch most popular songs" });
  }
});

router.get("/current/liked-songs", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const songs = await getRecentlyLikedSongs(userId);
    res.status(200).json(songs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch recently liked songs" });
  }
});

//Create a new user using the sub claim as cognito id
//This requires the id token to get name and email claims,
//send it in the body of the request and verify separate from access token.
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
    console.error(e);
    if (e.code === "P2002") {
      return res.status(500).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Failed to create new user" });
  }
});

/**
 * Generates a pre-signed url for uploading an avatar.
 */
router.post(
  "/avatar/pre-signed-url",
  async (req: AuthenticatedRequest, res) => {
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
      const bucket = config.aws.bucket.images;
      const url = await createPresignedUrlWithClientPUT({
        bucket,
        key,
        contentType,
      });
      res.status(200).json({ url, objectKey: key });
    } catch (e) {
      console.error(e);
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
    console.error(e);
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
    console.error(e);
    res.status(500).json({ error: "Failed to delete avatar" });
  }
});

export default router;
