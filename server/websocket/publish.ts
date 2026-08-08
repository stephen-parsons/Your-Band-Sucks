import {
    LeaderboardUpdatePayload,
    SongLikedNotificationPayload,
} from "./events";
import { broadcastToChannel, sendToUser } from "./hub";

export function broadcastLeaderboardUpdate(
  payload: LeaderboardUpdatePayload,
): void {
  broadcastToChannel("leaderboard", {
    type: "leaderboard:update",
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
