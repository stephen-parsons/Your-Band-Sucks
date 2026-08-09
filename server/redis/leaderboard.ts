import chalk from "chalk";
import { prisma } from "../prisma";
import { LEADERBOARD_SONGS_KEY } from "./keys";
import { client } from "./redis";

function isRedisReady(): boolean {
  return Boolean(client && client.isOpen && client.isReady);
}

/**
 * Sets absolute likeCount score for a song in the leaderboard ZSET.
 */
export async function zAddSongScore(
  songId: number,
  likeCount: number,
): Promise<boolean> {
  try {
    if (!isRedisReady() || !client) {
      console.warn(
        `Redis not ready. Skipping ZADD for song: ${chalk.cyan(songId)}`,
      );
      return false;
    }
    await client.zAdd(LEADERBOARD_SONGS_KEY, {
      score: likeCount,
      value: String(songId),
    });
    return true;
  } catch (error) {
    console.error(`Failed to ZADD song ${songId}:`, error);
    return false;
  }
}

/**
 * Returns song IDs ranked highest by likeCount (most liked first).
 */
export async function zTopSongs(n: number): Promise<number[] | null> {
  try {
    if (!isRedisReady() || !client) {
      return null;
    }
    const members = await client.zRange(LEADERBOARD_SONGS_KEY, 0, n - 1, {
      REV: true,
    });
    return members.map((id) => Number(id));
  } catch (error) {
    console.error("Failed to read top songs from ZSET:", error);
    return null;
  }
}

/**
 * Returns song IDs ranked lowest by likeCount (least liked first).
 */
export async function zBottomSongs(n: number): Promise<number[] | null> {
  try {
    if (!isRedisReady() || !client) {
      return null;
    }
    const members = await client.zRange(LEADERBOARD_SONGS_KEY, 0, n - 1);
    return members.map((id) => Number(id));
  } catch (error) {
    console.error("Failed to read bottom songs from ZSET:", error);
    return null;
  }
}

/**
 * Seeds the leaderboard ZSET from Postgres when empty. Soft-fails if Redis is down.
 */
export async function ensureLeaderboardSeeded(): Promise<boolean> {
  try {
    if (!isRedisReady() || !client) {
      return false;
    }
    const count = await client.zCard(LEADERBOARD_SONGS_KEY);
    if (count > 0) {
      return true;
    }
    const songs = await prisma.song.findMany({
      select: { id: true, likeCount: true },
    });
    if (songs.length === 0) {
      return true;
    }
    await client.zAdd(
      LEADERBOARD_SONGS_KEY,
      songs.map((song) => ({
        score: song.likeCount,
        value: String(song.id),
      })),
    );
    console.info("✅", `Seeded leaderboard ZSET with ${songs.length} songs`);
    return true;
  } catch (error) {
    console.error("Failed to seed leaderboard ZSET:", error);
    return false;
  }
}
