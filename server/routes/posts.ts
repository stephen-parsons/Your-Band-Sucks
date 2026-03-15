// server/routes/posts.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import config from "../config";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import {
  createPresignedUrlWithClient,
  generateS3Url,
} from "../service/S3Service";

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req: AuthenticatedRequest, res) => {
  //todo: get presignedUrls for audio streaming?
  try {
    const posts = await prisma.song.findMany({
      include: {
        likes: {
          where: {
            userId: req.userId,
          },
          select: { type: true },
        },
        tags: { select: { description: true, id: true } },
        user: { select: { name: true, avatar: true } },
      },
      omit: { userId: true, createdAt: true, updatedAt: true },
      where: {
        userId: {
          not: req.userId,
        },
      },
    });
    const newPosts = posts.map((post) => {
      const newPost = {
        ...post,
        url: generateS3Url(config.aws.bucket.audioFiles, post.key),
        like: post.likes[0]?.type.toLocaleLowerCase(),
      } as any;
      delete newPost.likes;
      delete newPost.key;
      return newPost;
    });
    console.info("POSTS", newPosts);
    res.status(200).json(newPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/new", async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  //store url as object key or full url to bucket?
  try {
    const {
      description,
      title,
      key,
      tags: rawTags,
    }: SongCreateInput & { tags: string[] } = req.body;
    const newSong = await prisma.song.create({
      data: {
        description,
        title,
        userId,
        tags: {
          connectOrCreate: rawTags.map((tag) => ({
            where: {
              description: tag.toLowerCase(),
            },
            create: { description: tag.toLowerCase() },
          })),
        },
        key,
      },
    });
    console.info("NEW SONG", newSong);
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
  //todo: sanitize filename for safety
  try {
    const {
      filename,
      contentType,
    }: {
      filename: string;
      contentType: string;
    } = req.body;
    const key = `${userId}/${filename}`;
    const bucket = config.aws.bucket.audioFiles;
    const url = await createPresignedUrlWithClient({
      bucket,
      key,
      contentType,
    });
    res.status(200).json({ objectKey: key, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get pre-signed-url" });
  }
});

router.post("/like", async (req: AuthenticatedRequest, res) => {
  //todo: get userId from jwt during auth
  const userId = req.userId!;
  try {
    const {
      liked,
      songId,
    }: {
      songId: number;
      liked: boolean;
    } = req.body;
    const type = liked ? "LIKE" : "DISLIKE";
    const likeResult = await prisma.likeDislike.upsert({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
      update: { type },
      create: { userId, songId, type },
    });
    const incrementAmount =
      likeResult.createdAt === likeResult.updatedAt ? 1 : 2;
    //update likeCount on song
    const result = await prisma.song.update({
      where: {
        id: songId,
      },
      data: {
        likeCount: liked
          ? {
              increment: incrementAmount,
            }
          : { decrement: incrementAmount },
      },
      select: {
        likeCount: true,
      },
    });
    res.status(200).json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to process like" });
  }
});

router.get("/most-liked", async (req, res) => {
  try {
    const posts = await prisma.song.findMany({
      include: {
        user: { select: { name: true, avatar: true } },
      },
      omit: { userId: true, createdAt: true, updatedAt: true },
      orderBy: {
        likeCount: "desc",
      },
      take: 10,
    });
    console.info("MOST LIKED", posts);
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch most-liked" });
  }
});

router.get("/least-liked", async (req, res) => {
  try {
    const posts = await prisma.song.findMany({
      include: {
        user: { select: { name: true, avatar: true } },
      },
      omit: { userId: true, createdAt: true, updatedAt: true },
      orderBy: {
        likeCount: "asc",
      },
      take: 10,
    });
    console.info("LEAST LIKED", posts);
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch least-liked" });
  }
});

export default router;
