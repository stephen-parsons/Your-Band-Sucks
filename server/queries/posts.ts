import { Song } from "../generated/prisma/client";
import { prisma } from "../prisma";

// Define the shape of the query result
export type FeedSongResult = Song & {
  // Included from the LikeDislike table for the current userId
  like: "like" | "dislike" | null;
};

/**
 * Get new posts for a user.
 *
 * This single query computes similarity scores (how many liked songs you share with other users) and ranks songs by:
 *
 * Unliked status: Songs the target user hasn't liked come first.
 *
 * Collaborative score: Songs liked by users who share the most overlap with the target user.
 *
 * Recency: Newer songs break ties (createdAt DESC).
 * @param userId current user Id
 * @param limit max posts
 * @returns
 */
export async function getRecommendedFeed(
  userId: number,
  limit: number,
): Promise<FeedSongResult[]> {
  return await prisma.$queryRaw<FeedSongResult[]>`
    WITH TargetUserLikes AS (
      -- Get all songs liked by the target user along with the 'type'
      SELECT "songId", "type"
      FROM "LikeDislike" 
      WHERE "userId" = ${userId}
    ),
    SimilarUsers AS (
      -- Find users who liked the same songs, ranked by count of shared likes
      SELECT 
        l."userId", 
        COUNT(l."songId") AS overlap_score
      FROM "LikeDislike" l
      INNER JOIN TargetUserLikes tul ON l."songId" = tul."songId"
      WHERE l."userId" != ${userId}
      GROUP BY l."userId"
    ),
    SongScores AS (
      -- Score candidate songs based on overlap score of users who liked them
      SELECT 
        s.id,
        COALESCE(SUM(su.overlap_score), 0) AS relevance_score,
        tul."type" AS target_user_like_type,
        CASE WHEN tul."songId" IS NOT NULL THEN 1 ELSE 0 END AS is_liked
      FROM "Song" s
      LEFT JOIN "LikeDislike" l ON s.id = l."songId"
      LEFT JOIN SimilarUsers su ON l."userId" = su."userId"
      LEFT JOIN TargetUserLikes tul ON s.id = tul."songId"
      WHERE s."userId" != ${userId}  -- Exclude songs owned by input user
      GROUP BY s.id, tul."songId", tul."type"
    )
    SELECT 
      s.*,
      ss.target_user_like_type AS "like",
      json_build_object(
        'name', u."name",
        'avatar', u."avatar"
      ) AS "user",
      COALESCE(
        json_agg(
          json_build_object(
            'id', t.id,
            'description', t.description
          )
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS "tags"
    FROM "Song" s
    JOIN SongScores ss ON s.id = ss.id
    JOIN "User" u ON s."userId" = u.id  -- Join song creator info
    LEFT JOIN "_SongToTag" st ON s.id = st."A"        -- Prisma implicit join table (A = Song)
    LEFT JOIN "Tag" t ON st."B" = t.id               -- Prisma implicit join table (B = Tag)
    GROUP BY s.id, ss.is_liked, ss.relevance_score, ss.target_user_like_type, u.id
    ORDER BY 
      ss.is_liked ASC,            -- 0 = Unliked first, 1 = Liked second
      ss.relevance_score DESC,    -- Songs recommended by similar users first
      s."createdAt" DESC          -- Newer songs first
    LIMIT ${limit};
  `;
}

/**
 * Pure prisma ts ORM query of {@linkcode getRecommendedFeed}
 */
export async function getRecommendedFeedPrisma(userId: number, limit: number) {
  // Step 1: Find songs the current user already liked
  const userLikes = await prisma.likeDislike.findMany({
    where: { userId },
    select: { songId: true },
  });
  const likedSongIds = userLikes.map((l) => l.songId);

  // Step 2: Find similar users who also liked those songs
  const similarUsers = await prisma.likeDislike.groupBy({
    by: ["userId"],
    where: {
      songId: { in: likedSongIds },
      userId: { not: userId },
    },
    _count: { songId: true },
    orderBy: { _count: { songId: "desc" } },
    take: 20, // Top 20 similar users
  });

  const similarUserIds = similarUsers.map((u) => u.userId);

  // Step 3: Fetch songs liked by similar users that the current user hasn't liked yet,
  // and don't belong to current user
  const unlikedCandidateSongs = await prisma.song.findMany({
    where: {
      userId: {
        not: userId,
      },
      id: { notIn: likedSongIds },
      likes: {
        some: {
          userId: { in: similarUserIds },
        },
      },
    },
    include: {
      _count: {
        select: {
          likes: {
            where: { userId: { in: similarUserIds } },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  // Sort by count of overlapping similar users, then by createdAt
  unlikedCandidateSongs.sort((a, b) => {
    const scoreDiff = b._count.likes - a._count.likes;
    if (scoreDiff !== 0) return scoreDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Step 4: If not enough candidate songs, fill remaining quota with fresh unliked songs
  if (unlikedCandidateSongs.length < limit) {
    const existingIds = [
      ...likedSongIds,
      ...unlikedCandidateSongs.map((s) => s.id),
    ];
    const fallbackSongs = await prisma.song.findMany({
      where: {
        id: { notIn: existingIds },
      },
      orderBy: { createdAt: "desc" },
      take: limit - unlikedCandidateSongs.length,
    });

    return [...unlikedCandidateSongs, ...fallbackSongs];
  }

  return unlikedCandidateSongs;
}

/**
 * Default query for all songs that don't belong to ther current user
 */
export async function allOtherSongs(userId: number) {
  return await prisma.song.findMany({
    include: {
      likes: {
        where: {
          userId,
        },
        select: { type: true },
      },
      tags: { select: { description: true, id: true } },
      user: { select: { name: true, avatar: true } },
    },
    omit: { userId: true, createdAt: true, updatedAt: true },
    where: {
      userId: {
        not: userId,
      },
    },
  });
}
