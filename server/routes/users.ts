// server/routes/users.ts

import bcrypt from "bcrypt";
import express from "express";
import config from "../config";
import { UserCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";
import { createPresignedUrlWithClient } from "../service/S3Service";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    console.info("USERS", users);
    res.status(200).json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { email, name, password, avatar }: UserCreateInput = req.body;

    const saltRounds = 10;
    // Hash the password, automatically generating a salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: { email, name, password: hashedPassword, avatar },
    });
    console.info("USER", newUser);
    res.status(200).json(newUser);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new user" });
  }
});

/**
 * Generates a pre-signed url for uploading an avatar.
 */
router.post("/pre-signed-url/avatar", async (req, res) => {
  //todo: get userId from create user response or jwt
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
    const bucket = config.aws.bucket.images;
    const url = await createPresignedUrlWithClient({
      bucket,
      key,
      contentType,
    });
    res.status(200).json({ url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get pre-signed-url for avatar" });
  }
});

export default router;
