import chalk from "chalk";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import createError from "http-errors";
import morganBody from "morgan-body";
import path from "path";
import { prisma } from "./prisma";
import { client, startRedis } from "./redis/redis";
import healthRouter from "./routes/health";
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
startRedis();

app.use("/health", healthRouter);
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
