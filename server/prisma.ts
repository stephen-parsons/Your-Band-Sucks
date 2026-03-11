import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import config from "./config";
import { PrismaClient } from "./generated/prisma/client";
import { generateS3Url } from "./service/S3Service";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    user: {
      avatar: {
        needs: { avatar: true },
        compute({ avatar }) {
          console.log(avatar);
          if (avatar === "") return null;
          return generateS3Url(config.aws.bucket.images, avatar);
        },
      },
    },
  },
});

console.info("Created new prisma client");

export { prisma };
