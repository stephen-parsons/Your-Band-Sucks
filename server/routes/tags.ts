// server/routes/tags.ts

import express from "express";
import { prisma } from "../prisma";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const tags = await prisma.tag.findMany();
    res.status(200).json(
      tags.map((tag) => ({
        id: tag.id.toString(),
        description: tag.description,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
