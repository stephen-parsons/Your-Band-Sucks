// server/routes/users.ts

import bcrypt from "bcrypt";
import express from "express";
import { UserCreateInput } from "../generated/prisma/models";
import { prisma } from "../prisma";

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
    const { email, name, password }: UserCreateInput = req.body;

    const saltRounds = 10;
    // Hash the password, automatically generating a salt
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: { email, name, password: hashedPassword },
    });
    console.info("USER", newUser);
    res.status(200).json(newUser);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: "Failed to create new user" });
  }
});

export default router;
