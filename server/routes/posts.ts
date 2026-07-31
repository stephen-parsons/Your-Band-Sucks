// server/routes/posts.ts

import express from "express";
import { AuthenticatedRequest } from "..";
import { cognitoAuthorizer } from "../authorizer";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import { getRecommendedFeed } from "../queries/posts";
import { userPostsCacheKey } from "../redis/keys";
import { getCacheItem, setCacheItem } from "../redis/redis";
import {
  BUCKETS,
  createPresignedUrlWithClientGET,
  createPresignedUrlWithClientPUT,
} from "../service/S3Service";

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
    const bucket = BUCKETS.audioFiles;
    const url = await createPresignedUrlWithClientPUT({
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
    const likeResult = await prisma.likeDislike.findUnique({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    });
    if (likeResult?.type.toUpperCase() === type) {
      throw new Error(`Song already liked: ${liked} by user: ${userId}`);
    }
    const update = await prisma.likeDislike.upsert({
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
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch least-liked" });
  }
});

export default router;
