// server/routes/posts.ts

import express from "express";
import { SongCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const posts = await prisma.song.findMany();
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
      tags,
    }: SongCreateInput & { userId: number } = req.body;
    const newSong = await prisma.song.create({
      data: { description, title, userId, tags },
    });
    console.info("NEW SONG", newSong);
    res.status(200).json(newSong);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new song" });
  }
});

export default router;

const fakePosts = [
  {
    id: "1",
    user: "Stephen (Lead developer)",
    link: "http://192.168.4.134:5500/Burnout_Stephen_2-19.mp3",
    title: "Burnout California (Demo)",
    description: "New Run Motor Run song",
    avatar: "http://192.168.4.134:5500/stephen.jpg",
    tags: ["rock", "punk", "riffs"],
  },
  {
    id: "2",
    user: "Fake user",
    link: "http://192.168.4.134:5500/Practice_2024_0626_CMDGF.mp3",
    title: "Song 2",
    description: "Song 2",
    tags: ["tag"],
  },
  {
    id: "3",
    user: "Fake user 2",
    link: "http://192.168.4.134:5500/Burnout_Stephen_2-19.mp3",
    title: "Song 3",
    description: "Song 3",
    tags: ["tag 2"],
  },
];
