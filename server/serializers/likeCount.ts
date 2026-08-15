import { zScoreSongLikeCounts } from "../redis/leaderboard";

export interface PostWithLikeCount {
  id: number;
  likeCount: number;
}

/**
 * Overwrite each post's likeCount with the real-time ZSET score when available.
 * Falls back to the cached/DB likeCount when Redis has no score for that song.
 */
export async function serializeRealtimeLikeCounts<T extends PostWithLikeCount>(
  posts: T[],
): Promise<T[]> {
  if (posts.length === 0) {
    return posts;
  }

  const scores = await zScoreSongLikeCounts(posts.map((post) => post.id));
  if (scores.size === 0) {
    return posts;
  }

  return posts.map((post) => {
    const realtimeLikeCount = scores.get(post.id);
    if (realtimeLikeCount === undefined) {
      return post;
    }
    return {
      ...post,
      likeCount: realtimeLikeCount,
    };
  });
}
