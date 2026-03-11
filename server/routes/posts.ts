// server/routes/posts.ts

import express from "express";
import config from "../config";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import {
  createPresignedUrlWithClient,
  generateS3Url,
} from "../service/S3Service";

const router = express.Router();

const userId = 2;
//TODO: for user queries, get avatar

router.get("/", async (req, res) => {
  //todo: get presignedUrls for audio streaming?
  //or make bucket public
  try {
    const posts = await prisma.song.findMany({
      include: {
        likes: {
          where: {
            userId,
          },
          select: { type: true },
        },
        tags: { select: { description: true } },
        user: { select: { name: true, avatar: true } },
      },
      omit: { userId: true },
      where: {
        userId: {
          not: userId,
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
      return newPost;
    });
    console.info("POSTS", newPosts);
    res.status(200).json(newPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/new", async (req, res) => {
  //todo: get userId from jwt during auth
  //store url as object key or full url to bucket?
  try {
    const {
      description,
      title,
      userId,
      key,
      tags: rawTags,
    }: SongCreateInput & { userId: number; tags: string[] } = req.body;
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
router.post("/pre-signed-url", async (req, res) => {
  //todo: get userId from jwt during auth
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
    const bucket = config.aws.bucket.audioFiles;
    const url = await createPresignedUrlWithClient({
      bucket,
      key,
      contentType,
    });
    res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get pre-signed-url" });
  }
});

router.post("/like", async (req, res) => {
  //todo: get userId from jwt during auth
  try {
    const {
      userId,
      liked,
      songId,
    }: {
      songId: number;
      userId: number;
      liked: boolean;
    } = req.body;
    const type = liked ? "LIKE" : "DISLIKE";
    await prisma.likeDislike.upsert({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
      update: { type },
      create: { userId, songId, type },
    });
    //update likeCount on song
    const result = await prisma.song.update({
      where: {
        id: songId,
      },
      data: {
        likeCount: liked
          ? {
              increment: 1,
            }
          : { decrement: 1 },
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
      omit: { userId: true },
      orderBy: {
        likeCount: "desc",
      },
      take: 10,
    });
    console.info("POSTS", posts);
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
      omit: { userId: true },
      orderBy: {
        likeCount: "asc",
      },
      take: 10,
    });
    console.info("POSTS", posts);
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch least-liked" });
  }
});

export default router;
