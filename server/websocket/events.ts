export interface LikeCountUpdatePayload {
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
  | { type: "likeCountUpdate"; payload: LikeCountUpdatePayload }
  | { type: "notification:song_liked"; payload: SongLikedNotificationPayload };
