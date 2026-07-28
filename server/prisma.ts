import { PrismaPg } from "@prisma/adapter-pg";
import chalk from "chalk";
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

console.info(
  "✅",
  "Created new prisma client: ",
  chalk.green(connectionString),
);

export { prisma };
