// server/routes/posts.ts

import express from "express";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import { createPresignedUrlWithClient } from "../service/S3Service";

const router = express.Router();

router.get("/", async (req, res) => {
  //todo: get presignedUrls for audio streaming?
  //or make bucket public
  try {
    const posts = await prisma.song.findMany({
      include: {
        tags: { select: { description: true } },
        user: { select: { name: true } },
      },
      omit: { userId: true },
    });
    console.info("POSTS", posts);
    res.status(200).json(posts);
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
      url,
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
        url,
      },
    });
    console.info("NEW SONG", newSong);
    res.status(200).json(newSong);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new song" });
  }
});

router.post("/pre-signed-url", async (req, res) => {
  //todo: get userId from jwt during auth
  //todo: sanitize filename for safety
  try {
    const {
      filename,
      userId,
    }: {
      userId: number;
      filename: string;
    } = req.body;
    const key = `${userId}/${filename}`;
    const url = await createPresignedUrlWithClient({ key });
    res.status(200).json(url);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new song" });
  }
});

export default router;
