// server/routes/users.ts

import bcrypt from "bcrypt";
import express from "express";
import config from "../config";
import { UserCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import { createPresignedUrlWithClient } from "../service/S3Service";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    console.info("USERS", users);
    res.status(200).json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

//TODO: get id from jwt
router.get("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
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
      .json({ error: `Failed to fetch user by id: ${req.params.id}` });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { email, name, password, avatar }: UserCreateInput = req.body;

    const saltRounds = 10;
    // Hash the password, automatically generating a salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: { email, name, password: hashedPassword, avatar },
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
router.post("/avatar/pre-signed-url", async (req, res) => {
  //todo: get userId from create user response or jwt
  //todo: sanitize filename for safety
  try {
    const {
      filename,
      userId,
      contentType,
    }: {
      userId: number;
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
    res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get pre-signed-url for avatar" });
  }
});

/**
 * Updates avatar for a user
 */
router.post("/avatar/update", async (req, res) => {
  try {
    const { userId, key }: { userId: number; key: string } = req.body;

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
