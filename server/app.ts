import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import createError from "http-errors";
import morganBody from "morgan-body";
import path from "path";
import { prisma } from "./prisma";
import { client, connectCache, healthCheck } from "./redis/redis";
import postsRouter from "./routes/posts";
import tagsRouter from "./routes/tags";
import usersRouter from "./routes/users";

const app: express.Application = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
//todo: restrict cors in production
app.use(cors());

morganBody(app);

//redis startup
connectCache()
  .then(() => {
    healthCheck().then((res) => console.info("Redis Health:", res));
  })
  .catch((e) => {
    console.clear();
    console.warn(
      "⚠️ ",
      "Starting server without Redis: ",
      chalk.red(process.env.REDIS_URL),
    );
    console.error("🚨", e);
  });

app.get("/health", async (req, res) => {
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

app.use("/users", usersRouter);
app.use("/posts", postsRouter);
app.use("/tags", tagsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (
  err: Error,
  req: express.Request,
  res: express.Response,
  next: Function,
) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status((err as any).status || 500);
  res.send(`error: ${err}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\n❗ Received ${signal}. Starting graceful shutdown...`);

  console.info(chalk.red("\nClosing prisma connection..."));
  await prisma.$disconnect();

  if (client?.isOpen) {
    try {
      console.log("Disconnecting from Redis...");
      // .quit() awaits pending commands before closing.
      // If you want an immediate forced disconnect instead, use client.disconnect()
      await client.quit();
      console.log("Redis client disconnected cleanly.");
    } catch (err) {
      console.error("Error during Redis disconnect:", err);
    }
  }

  console.log(chalk.red("Shutdown complete. Exiting."));
  process.exit(0);
}

process.on("SIGINT", async () => {
  gracefulShutdown("SIGINT");
});

process.on("SIGTERM", async () => {
  gracefulShutdown("SIGTERM");
});

module.exports = app;
