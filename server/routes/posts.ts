// server/routes/posts.ts

import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // const posts = prisma.song.findMany();
    console.info("POSTS", fakePosts);
    res.status(200).json(fakePosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
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
