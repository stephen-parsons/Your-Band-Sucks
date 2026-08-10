import { LikeCountUpdatePayload, SongLikedNotificationPayload } from "./events";
import { broadcastToAll, sendToUser } from "./hub";

export function broadcastLikeCountUpdate(
  payload: LikeCountUpdatePayload,
): void {
  broadcastToAll({
    type: "likeCountUpdate",
    payload,
  });
}

export function notifySongLiked(
  userId: number,
  payload: SongLikedNotificationPayload,
): void {
  sendToUser(userId, {
    type: "notification:song_liked",
    payload,
  });
}
