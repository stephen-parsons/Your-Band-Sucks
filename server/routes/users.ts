// server/routes/users.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import config from "../config";
import { prisma } from "../prisma";
import { IdTokenClaimsPayload, verifyIdToken } from "../service/CognitoService";
import { createPresignedUrlWithClient } from "../service/S3Service";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.use(cognitoAuthorizer);

//send 404 when user it not found to trigger onboarding
router.get("/current", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId;
    const user = await prisma.user.findFirst({
      where: { id: { equals: userId } },
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
      const url = await createPresignedUrlWithClient({
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

export default router;
