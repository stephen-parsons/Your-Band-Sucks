import chalk from "chalk";
import { prisma } from "../prisma";
import { userIdCognitoIdCacheKey } from "../redis/keys";
import { getCacheItem, setCacheItem } from "../redis/redis";
import { verifyAccessToken } from "../service/CognitoService";
import { moduleLogger } from "../util/logger";

export const authResolveLogger = moduleLogger("auth/resolveUser");

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
  const user = await prisma.user.findFirst({
    where: { cognitoId: { equals: cognitoId } },
    select: {
      id: true,
    },
  });
  if (user) {
    await setCacheItem(userIdCognitoIdCacheKey(cognitoId), user.id);
    return user.id;
  }
  return null;
}

async function getCachedUserId(cognitoId: string): Promise<number | null> {
  return await getCacheItem<number>(userIdCognitoIdCacheKey(cognitoId));
}
