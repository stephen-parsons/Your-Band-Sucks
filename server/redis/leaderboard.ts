import chalk from "chalk";
import { fetchAllSongLikeCounts } from "../queries/leaderboard";
import { LEADERBOARD_SONGS_KEY } from "./keys";
import { client } from "./redis";

function isRedisReady(): boolean {
  return Boolean(client && client.isOpen && client.isReady);
}

/**
 * Returns the real-time likeCount for a song from the leaderboard ZSET.
 * Soft-fails to null if Redis is down or the member is missing.
 */
export async function zScoreSongLikeCount(
  songId: number,
): Promise<number | null> {
  try {
    if (!isRedisReady() || !client) {
      console.warn(
        `Redis not ready. Skipping ZSCORE for song: ${chalk.cyan(songId)}`,
      );
      return null;
    }
    const score = await client.zScore(LEADERBOARD_SONGS_KEY, String(songId));
    return score === null || score === undefined ? null : score;
  } catch (error) {
    console.error(`Failed to ZSCORE song ${songId}:`, error);
    return null;
  }
}

/**
 * Batch-reads real-time likeCounts for many songs via a Redis pipeline.
 * Missing members / Redis failures omit that id from the map.
 */
export async function zScoreSongLikeCounts(
  songIds: number[],
): Promise<Map<number, number>> {
  const scores = new Map<number, number>();
  if (songIds.length === 0) {
    return scores;
  }

  try {
    if (!isRedisReady() || !client) {
      console.warn("Redis not ready. Skipping batch ZSCORE.");
      return scores;
    }

    const results = await Promise.all(
      songIds.map((songId) =>
        client!.zScore(LEADERBOARD_SONGS_KEY, String(songId)),
      ),
    );

    songIds.forEach((songId, index) => {
      const score = results[index];
      if (score !== null && score !== undefined) {
        scores.set(songId, score);
      }
    });
    return scores;
  } catch (error) {
    console.error("Failed to batch ZSCORE songs:", error);
    return scores;
  }
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
    const songs = await fetchAllSongLikeCounts();
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
