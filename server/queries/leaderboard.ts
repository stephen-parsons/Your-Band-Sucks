import { prisma } from "../prisma";

export const LEADERBOARD_LIMIT = 10;

const songLeaderboardSelect = {
  include: {
    user: { select: { name: true, avatar: true } },
  },
  omit: { userId: true, createdAt: true, updatedAt: true },
} as const;

/**
 * Hydrates song+user rows for the given IDs, preserving input order.
 */
export async function hydrateSongsByIds(songIds: number[]) {
  if (songIds.length === 0) {
    return [];
  }
  const songs = await prisma.song.findMany({
    where: { id: { in: songIds } },
    ...songLeaderboardSelect,
  });
  const byId = new Map(songs.map((song) => [song.id, song]));
  return songIds
    .map((id) => byId.get(id))
    .filter((song): song is NonNullable<typeof song> => song !== undefined);
}

export async function fetchMostLikedFromDb() {
  return prisma.song.findMany({
    ...songLeaderboardSelect,
    orderBy: { likeCount: "desc" },
    take: LEADERBOARD_LIMIT,
  });
}

export async function fetchLeastLikedFromDb() {
  return prisma.song.findMany({
    ...songLeaderboardSelect,
    orderBy: { likeCount: "asc" },
    take: LEADERBOARD_LIMIT,
  });
}
