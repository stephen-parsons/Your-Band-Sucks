export function userIdCognitoIdCacheKey(cognitoId: string) {
  return `cognito:${cognitoId}:user`;
}

export function userPostsCacheKey(userId: number) {
  return `user:${userId}:posts`;
}
