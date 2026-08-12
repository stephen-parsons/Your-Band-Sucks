import { prisma } from "../prisma";

export const PROFILE_SONGS_LIMIT = 10;

export interface ProfileSongRow {
  id: number;
  title: string;
  likeCount: number;
}

export interface CreateUserInput {
  email: string;
  name: string;
  username: string;
  cognitoId: string;
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

export async function findUserIdByCognitoId(
  cognitoId: string,
): Promise<number | null> {
  const user = await prisma.user.findFirst({
    where: { cognitoId: { equals: cognitoId } },
    select: {
      id: true,
    },
  });
  return user?.id ?? null;
}

export async function findUserProfileByCognitoId(cognitoId: string) {
  return prisma.user.findFirst({
    where: { cognitoId: { equals: cognitoId } },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      songs: {
        select: {
          id: true,
          title: true,
          likeCount: true,
        },
        take: 10,
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function findUserTagsByCognitoId(cognitoId: string) {
  return prisma.tag.findMany({
    where: {
      songs: {
        every: {
          user: { cognitoId },
        },
      },
    },
    select: {
      id: true,
      description: true,
      _count: true,
    },
    take: 10,
    orderBy: { songs: { _count: "desc" } },
  });
}

export async function createUser({
  email,
  name,
  username,
  cognitoId,
}: CreateUserInput) {
  return prisma.user.create({
    data: { email, name, username, cognitoId },
  });
}

export async function updateUserAvatar(userId: number, key: string) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      avatar: {
        set: key,
      },
    },
    select: {
      id: true,
      avatar: true,
    },
  });
}

export async function findUserAvatar(userId: number) {
  return prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      avatar: true,
    },
  });
}

export async function clearUserAvatar(userId: number) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      avatar: {
        set: undefined,
      },
    },
    select: {
      id: true,
    },
  });
}
