import { prisma } from "../prisma";

export const PROFILE_SONGS_LIMIT = 10;

export interface ProfileSongRow {
  id: number;
  title: string;
  likeCount: number;
}

/**
 * Current user's own songs ranked by likeCount (liked by others).
 */
export async function getMostPopularSongs(
  userId: number,
): Promise<ProfileSongRow[]> {
  return prisma.song.findMany({
    where: { userId },
    select: { id: true, title: true, likeCount: true },
    orderBy: { likeCount: "desc" },
    take: PROFILE_SONGS_LIMIT,
  });
}

/**
 * Songs the current user most recently liked.
 */
export async function getRecentlyLikedSongs(
  userId: number,
): Promise<ProfileSongRow[]> {
  const likes = await prisma.likeDislike.findMany({
    where: { userId, type: "LIKE" },
    select: {
      song: { select: { id: true, title: true, likeCount: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: PROFILE_SONGS_LIMIT,
  });
  return likes.map((like) => like.song);
}
