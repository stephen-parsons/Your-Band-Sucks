import express from "express";
import { client } from "../redis/redis";

const router = express.Router();

router.get("/", async (req, res) => {
  // Promise that rejects after 2000 milliseconds
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis ping timed out")), 2000),
  );

  try {
    // Race the Redis ping against the timeout promise
    const pong = client && (await Promise.race([client.ping(), timeout]));

    if (pong === "PONG") {
      return res.status(200).send({ status: "UP", redis: "HEALTHY" });
    }

    res.status(503).send({ status: "DOWN", redis: "UNHEALTHY" });
  } catch (err: any) {
    res.status(503).send({ status: "DOWN", error: err.message });
  }
});

export default router;
