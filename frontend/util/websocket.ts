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

export interface LikeNotification extends SongLikedNotificationPayload {
  id: string;
}

export function isWsServerEvent(value: unknown): value is WsServerEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const event = value as Record<string, unknown>;
  return (
    event.type === "leaderboard:update" ||
    event.type === "notification:song_liked"
  );
}

export function toWebSocketUrl(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/$/, "");
  if (trimmed.startsWith("https://")) {
    return `${trimmed.replace(/^https/, "wss")}/ws`;
  }
  if (trimmed.startsWith("http://")) {
    return `${trimmed.replace(/^http/, "ws")}/ws`;
  }
  return `ws://${trimmed}/ws`;
}
