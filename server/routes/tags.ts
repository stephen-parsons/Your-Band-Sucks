// server/routes/tags.ts

import express from "express";
import { cognitoAuthorizer } from "../authorizer";
import { prisma } from "../prisma";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req, res) => {
  try {
    const tags = mapTagResults(await prisma.tag.findMany());
    res.status(200).json(tags);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
