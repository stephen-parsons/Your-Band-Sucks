// server/routes/posts.ts

import express from "express";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";

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
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/new", async (req, res) => {
  //todo: get userId from jwt during auth
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

export default router;
