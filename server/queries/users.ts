import { LikeType } from "../generated/prisma/enums";
import { prisma } from "../prisma";

export const PROFILE_SONGS_LIMIT = 10;

export interface ProfileAudioSong {
  id: number;
  title: string;
  description: string;
  key: string;
  likeCount: number;
  user: {
    name: string;
    avatar: string | null;
  };
  tags: Array<{
    id: number;
    description: string;
  }>;
  like: LikeType | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  username: string;
  cognitoId: string;
}

const profileSongSelect = {
  id: true,
  title: true,
  description: true,
  key: true,
  likeCount: true,
  user: { select: { name: true, avatar: true } },
  tags: { select: { id: true, description: true } },
} as const;

function mapSongWithViewerLike(song: {
  id: number;
  title: string;
  description: string;
  key: string;
  likeCount: number;
  user: { name: string; avatar: string | null };
  tags: Array<{ id: number; description: string }>;
  likes: Array<{ type: LikeType }>;
}): ProfileAudioSong {
  const { likes, ...rest } = song;
  return {
    ...rest,
    like: likes[0]?.type ?? null,
  };
}

/**
 * Current user's own songs ranked by likeCount (liked by others).
 */
export async function getMostPopularSongs(
  userId: number,
): Promise<ProfileAudioSong[]> {
  const songs = await prisma.song.findMany({
    where: { userId },
    select: {
      ...profileSongSelect,
      likes: {
        where: { userId },
        select: { type: true },
        take: 1,
      },
    },
    orderBy: { likeCount: "desc" },
    take: PROFILE_SONGS_LIMIT,
  });
  return songs.map(mapSongWithViewerLike);
}

/**
 * Songs the current user most recently liked.
 */
export async function getRecentlyLikedSongs(
  userId: number,
): Promise<ProfileAudioSong[]> {
  const likes = await prisma.likeDislike.findMany({
    where: { userId, type: "LIKE" },
    select: {
      song: { select: profileSongSelect },
    },
    orderBy: { updatedAt: "desc" },
    take: PROFILE_SONGS_LIMIT,
  });
  return likes.map((like) => ({
    ...like.song,
    like: LikeType.LIKE,
  }));
}

/**
 * Current user's most recently uploaded songs.
 */
export async function getRecentlyUploadedSongs(
  userId: number,
): Promise<ProfileAudioSong[]> {
  const songs = await prisma.song.findMany({
    where: { userId },
    select: {
      ...profileSongSelect,
      likes: {
        where: { userId },
        select: { type: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: PROFILE_SONGS_LIMIT,
  });
  return songs.map(mapSongWithViewerLike);
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
    },
  });
}

/**
 * Returns every tag on songs this user uploaded.
 * Counts and sort order are based on this user's songs, not the global tag total.
 * Limited to 10 tags.
 * @param cognitoId The cognito ID of the user to find tags for.
 * @returns An array of tags, sorted by the number of songs using the tag, in descending order.
 */
export async function findUserTagsByCognitoId(cognitoId: string) {
  const tags = await prisma.tag.findMany({
    where: {
      songs: {
        some: {
          user: { cognitoId },
        },
      },
    },
    select: {
      id: true,
      description: true,
      _count: {
        select: {
          songs: {
            where: {
              user: { cognitoId },
            },
          },
        },
      },
    },
  });

  return tags.sort((a, b) => b._count.songs - a._count.songs).slice(0, 10);
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
