import express from "express";
import { prisma } from "../prisma";
import { client, healthCheck } from "../redis/redis";

const router = express.Router();

const gitCommit = process.env.GIT_COMMIT ?? "unknown";
const gitCommitShort = gitCommit.slice(-7);

router.get("/", async (req, res) => {
  try {
    const connections = (await getActiveConnections()).map((connection) => {
      if (connection.state === null)
        return { count: connection.count.toString(), state: "idle" };
      return { ...connection, count: connection.count.toString() };
    });
    const pong = await pingRedis();

    return res.status(200).send({
      status: "UP",
      commit: gitCommitShort,
      redis: pong,
      db: { status: "UP", connections },
    });
  } catch (err: unknown) {
    console.error(err);
    res.status(503).send({ status: "DOWN", commit: gitCommitShort });
  }
});

async function pingRedis() {
  try {
    if (!client?.isOpen) throw new Error("Redis client is not open.");
    const ping = await healthCheck();
    return ping.response === "PONG" ? "HEALTHY" : "UNHEALTHY";
  } catch (e) {
    console.error("Redis health check failed:", e);
    return "UNHEALTHY";
  }
}

async function getActiveConnections(): Promise<PGConnections[]> {
  // Queries the pg_stat_activity view to fetch open connections
  return await prisma.$queryRaw<PGConnections[]>`
      SELECT state, count(*) 
      FROM pg_stat_activity 
      GROUP BY state;
    `;
}

interface PGConnections {
  state: string;
  count: string;
}

export default router;
