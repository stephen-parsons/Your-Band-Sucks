export interface LeaderboardUpdatePayload {
  songId: number;
  likeCount: number;
  title: string;
  user: { name: string; avatar: string | null };
}

export interface SongLikedNotificationPayload {
  songId: number;
  title: string;
  message: string;
}

export type WsServerEvent =
  | { type: "leaderboard:update"; payload: LeaderboardUpdatePayload }
  | { type: "notification:song_liked"; payload: SongLikedNotificationPayload };

export type WsChannel = "leaderboard";

export type WsClientMessage =
  | { action: "subscribe"; channel: WsChannel }
  | { action: "unsubscribe"; channel: WsChannel };

export function isWsClientMessage(value: unknown): value is WsClientMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const msg = value as Record<string, unknown>;
  if (msg.action !== "subscribe" && msg.action !== "unsubscribe") {
    return false;
  }
  return msg.channel === "leaderboard";
}
