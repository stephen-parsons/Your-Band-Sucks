import { prisma } from "../prisma";

export async function findAllTags() {
  return prisma.tag.findMany();
}
