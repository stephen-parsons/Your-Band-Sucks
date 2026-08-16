import chalk from "chalk";
import { findUserIdByCognitoId } from "../queries/users";
import { userIdCognitoIdCacheKey } from "../redis/keys";
import { getCacheItem, setCacheItem } from "../redis/redis";
import { verifyAccessToken } from "../service/CognitoService";
import { moduleLogger } from "../util/logger";

export const authResolveLogger = moduleLogger("auth/resolveUser", {
  devOnly: false,
});

export interface ResolvedAuthUser {
  cognitoId: string;
  userId: number | null;
}

/**
 * Verifies a Cognito access token and resolves the app userId (cache then DB).
 * Returns userId null when the Cognito user has no app User row yet.
 */
export async function resolveUserIdFromAccessToken(
  token: string,
): Promise<ResolvedAuthUser> {
  const result = await verifyAccessToken(token);
  const cognitoId = result.sub;

  let userId = await getCachedUserId(cognitoId);
  if (!userId) {
    authResolveLogger.info(
      "Cache miss looking up user id",
      chalk.cyan(cognitoId),
    );
    userId = await findAndCacheUserId(cognitoId);
  }

  return { cognitoId, userId };
}

async function findAndCacheUserId(cognitoId: string): Promise<number | null> {
  const userId = await findUserIdByCognitoId(cognitoId);
  if (userId) {
    await setCacheItem(userIdCognitoIdCacheKey(cognitoId), userId);
    return userId;
  }
  return null;
}

async function getCachedUserId(cognitoId: string): Promise<number | null> {
  return await getCacheItem<number>(userIdCognitoIdCacheKey(cognitoId));
}
