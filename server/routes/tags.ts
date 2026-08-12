// server/routes/tags.ts

import express from "express";
import { cognitoAuthorizer } from "../authorizer";
import { findAllTags } from "../queries/tags";
import { mapTagResults } from "../util/tags";

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req, res) => {
  try {
    const tags = mapTagResults(await findAllTags());
    res.status(200).json(tags);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
