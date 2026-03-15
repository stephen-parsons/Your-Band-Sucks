// server/routes/posts.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import config from "../config";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import { verifyAccessToken } from "../service/CognitoService";
import {
  createPresignedUrlWithClient,
  generateS3Url,
} from "../service/S3Service";

const router = express.Router();

router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized: Missing token");
  }

  const token = authHeader.split(" ")[1];

  try {
    const result = await verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        cognitoId: result.sub,
      },
      select: {
        id: true,
      },
    });
    if (!user) throw new Error("No user found!!!");
    //add the queried userId to the req object
    (req as AuthenticatedRequest).userId = user.id;
    console.log("Found user: " + user.id);
    next(); // Token is valid, proceed to the next handler
  } catch (error: any) {
    res.status(401).send(error.message);
  }
});

router.get("/", async (req: AuthenticatedRequest, res) => {
  //todo: get presignedUrls for audio streaming?
  //or make bucket public
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
