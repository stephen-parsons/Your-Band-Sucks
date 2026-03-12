import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import createError from "http-errors";
import logger from "morgan";
import path from "path";
import { prisma } from "./prisma";
import postsRouter from "./routes/posts";
import tagsRouter from "./routes/tags";
import usersRouter from "./routes/users";

const app: express.Application = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
//todo: restrict cors in production
app.use(cors());

app.use("/health", (req, res) => res.send("Hello World!"));
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

process.on("SIGINT", async () => {
  console.info("Closing prisma connection...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.info("Closing prisma connection...");
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
