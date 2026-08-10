import { LikeCountUpdatePayload } from "@/util/websocket";

export interface LikeCountable {
  id: number;
  title: string;
  likeCount: number;
}

/**
 * Returns null if songId is not in the list (caller should skip setState).
 * Otherwise returns a new list with likeCount/title bumped for that song.
 */
export function bumpLikeCountIfPresent<T extends LikeCountable>(
  list: T[],
  payload: LikeCountUpdatePayload,
): T[] | null {
  const index = list.findIndex((item) => item.id === payload.songId);
  if (index === -1) {
    return null;
  }
  return list.map((item, i) =>
    i === index
      ? { ...item, likeCount: payload.likeCount, title: payload.title }
      : item,
  );
}

/**
 * Like bumpLikeCountIfPresent, then re-sort descending by likeCount.
 * Returns null if songId is not in the list.
 */
export function bumpAndSortPopular<T extends LikeCountable>(
  list: T[],
  payload: LikeCountUpdatePayload,
): T[] | null {
  const bumped = bumpLikeCountIfPresent(list, payload);
  if (!bumped) {
    return null;
  }
  return [...bumped].sort((a, b) => b.likeCount - a.likeCount);
}

/**
 * Leaderboard-style patch: song may enter or leave the board; sort + slice to limit.
 */
export function patchRankedLikeCountList<T extends LikeCountable>(
  list: T[],
  payload: LikeCountUpdatePayload,
  options: {
    ascending: boolean;
    limit: number;
    toItem: (payload: LikeCountUpdatePayload) => T;
  },
): T[] {
  const { ascending, limit, toItem } = options;
  const without = list.filter((item) => item.id !== payload.songId);
  const existing = list.find((item) => item.id === payload.songId);
  const merged: T = existing
    ? { ...existing, likeCount: payload.likeCount, title: payload.title }
    : toItem(payload);

  const edge = without[without.length - 1];
  const shouldInclude =
    existing !== undefined ||
    without.length < limit ||
    (ascending
      ? payload.likeCount <= (edge?.likeCount ?? Infinity)
      : payload.likeCount >= (edge?.likeCount ?? -Infinity));

  if (!shouldInclude) {
    return without.slice(0, limit);
  }

  return [...without, merged]
    .sort((a, b) =>
      ascending ? a.likeCount - b.likeCount : b.likeCount - a.likeCount,
    )
    .slice(0, limit);
}
