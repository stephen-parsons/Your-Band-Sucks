import { PrismaPg } from "@prisma/adapter-pg";
import chalk from "chalk";
import "dotenv/config";
import { resolveDatabaseUrl } from "./databaseUrl";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = resolveDatabaseUrl();

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const host = process.env.DB_HOST ?? "(from DB_URL)";
const name = process.env.DB_NAME ?? "";
console.info(
  "✅",
  "Created new prisma client: ",
  chalk.green(`${host}${name ? `/${name}` : ""}`),
);

export { prisma };
