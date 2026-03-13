import { Tag } from "../generated/prisma/client";

interface TagWithCount extends Omit<Tag, "createdAt" | "updatedAt"> {
  _count?: { songs: number };
}

export function mapTagResults(tags: TagWithCount[]) {
  return tags.map((tag) => ({
    ...(tag._count && { count: tag._count.songs }),
    id: tag.id.toString(),
    description: tag.description,
  }));
}
