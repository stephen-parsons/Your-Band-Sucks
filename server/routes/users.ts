// server/routes/users.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import config from "../config";
import { prisma } from "../prisma";
import { IdTokenClaimsPayload, verifyIdToken } from "../service/CognitoService";
import {
  createPresignedUrlWithClientPUT,
  deleteS3Object,
} from "../service/S3Service";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.use(cognitoAuthorizer);

//return null if user is not found
router.get("/current", async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, cognitoId } = req;
    const user = await prisma.user.findFirst({
      //check cognitoId instead of userId, in case user has not been created yet
      //call `/new` below if user is not found
      where: { cognitoId: { equals: cognitoId } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        songs: {
          select: {
            title: true,
            likeCount: true,
          },
          take: 10,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      console.info("User not found, create an new user!");
      return res.status(200).json(null);
    }

    const userTags = await prisma.tag.findMany({
      where: {
        songs: {
          every: {
            user: { id: userId },
          },
        },
      },
      select: {
        id: true,
        description: true,
        _count: true,
      },
      take: 10,
      orderBy: { songs: { _count: "desc" } },
    });
    const result = { ...user, tags: mapTagResults(userTags) };
    console.info("USER", result);
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: `Failed to fetch user by id: ${req.userId}` });
  }
});

//Create a new user using the sub claim as cognito id
//This requires the id token to get name and email claims,
//send it in the body of the request and verify separate from access token.
router.post("/new", async (req, res) => {
  try {
    const { idToken }: { idToken: string } = req.body;

    const claims = (await verifyIdToken(idToken)) as IdTokenClaimsPayload;

    const { email, name } = claims;
    const username = claims["cognito:username"];

    const newUser = await prisma.user.create({
      data: { email, name, username },
    });
    console.info("USER", newUser);
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
    //todo: sanitize filename for safety
    const userId = req.userId!;
    try {
      const {
        filename,
        contentType,
      }: {
        filename: string;
        contentType: string;
      } = req.body;
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

    const nawAvatar = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatar: {
          set: key,
        },
      },
      select: {
        id: true,
        avatar: true,
      },
    });
    console.info("AVATAR", nawAvatar);
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
    const currentUser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        avatar: true,
      },
    });

    if (!currentUser?.avatar)
      throw new Error("User doesn't have an avatar to delete!");

    await deleteS3Object({
      bucket: config.aws.bucket.images,
      key: currentUser?.avatar,
    });

    const newUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatar: {
          set: undefined,
        },
      },
      select: {
        id: true,
      },
    });
    console.info("Avatar deleted for: ", newUser);
    res.status(200).json(newUser);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed to update avatar" });
  }
});

export default router;
