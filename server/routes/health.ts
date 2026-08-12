import express from "express";
import { getActivePgConnections } from "../queries/health";
import { client, healthCheck } from "../redis/redis";
import { getWebSocketHealth } from "../websocket/hub";

const router = express.Router();

const gitCommit = process.env.GIT_COMMIT ?? "unknown";
const gitCommitShort = gitCommit.slice(-7);

router.get("/", async (req, res) => {
  try {
    const connections = (await getActivePgConnections()).map((connection) => {
      if (connection.state === null)
        return { count: connection.count.toString(), state: "idle" };
      return { ...connection, count: connection.count.toString() };
    });
    const pong = await pingRedis();
    const websocket = getWebSocketHealth();

    return res.status(200).send({
      status: "UP",
      commit: gitCommitShort,
      redis: pong,
      websocket,
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

export default router;
