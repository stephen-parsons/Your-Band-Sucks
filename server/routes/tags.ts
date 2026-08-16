// server/routes/tags.ts

import express from "express";
import { cognitoAuthorizer } from "../authorizer";
import { findAllTags } from "../queries/tags";
import { moduleLogger } from "../util/logger";
import { mapTagResults } from "../util/tags";

const tagsLogger = moduleLogger("tags", { devOnly: false });

const router = express.Router();

router.use(cognitoAuthorizer);

router.get("/", async (req, res) => {
  try {
    const tags = mapTagResults(await findAllTags());
    res.status(200).json(tags);
  } catch (e) {
    tagsLogger.error(e);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
