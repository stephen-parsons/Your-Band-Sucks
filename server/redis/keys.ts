export function userIdCognitoIdCacheKey(cognitoId: string) {
  return `cognito:${cognitoId}:user`;
}

export function userPostsCacheKey(userId: number) {
  return `user:${userId}:posts`;
}

export function userPopularSongsCacheKey(userId: number) {
  return `user:${userId}:popular-songs`;
}

export function userLikedSongsCacheKey(userId: number) {
  return `user:${userId}:liked-songs`;
}

export function userRecentUploadsCacheKey(userId: number) {
  return `user:${userId}:recent-uploads`;
}

export const LEADERBOARD_SONGS_KEY = "leaderboard:songs";
