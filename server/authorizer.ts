import chalk from "chalk";
import { RequestHandler } from "express";
import { AuthenticatedRequest } from ".";
import { prisma } from "./prisma";
import { userIdCognitoIdCacheKey } from "./redis/keys";
import { getCacheItem, setCacheItem } from "./redis/redis";
import { verifyAccessToken } from "./service/CognitoService";
import { moduleLogger } from "./util/logger";
/**
 * Paths that do not require a user to exist in the db, only cognito authorization.
 **/
const unauthorizedPaths = ["/current", "/new"];

export const authorizerLogger = moduleLogger("authorizer");

/**
 * Middleware that authorizes an AWS Cognito access token, sent as a Bearer token in the authorization header.
 * Attaches `cognitoId` and app `userId` to Express request.
 * @throws if there is no auth header
 * @throws if token verification fails
 * @throws if no user is found and the path is authorized
 */
export const cognitoAuthorizer: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized: Missing token");
  }

  const token = authHeader.split(" ")[1];

  try {
    const result = await verifyAccessToken(token);
    //add the cognitoId to the request
    (req as AuthenticatedRequest).cognitoId = result.sub;

    //try to get cached user id first
    let userId = await getCachedUserId(result.sub);

    //read from db if cached user id not found
    if (!userId) {
      authorizerLogger.info(
        "Cache miss looking up user id",
        chalk.cyan(result.sub),
      );
      userId = await findAndCacheUserId(result.sub);
    }

    if (!userId || userId === null) {
      //don't check for the app userId if creating a new account
      if (unauthorizedPaths.includes(req.path)) {
        authorizerLogger.info(
          "Skipping userId lookup for cognitoId: ",
          result.sub,
        );
        return next();
      }
      throw new Error("No user found!!!");
    }

    //add the userId to the request
    (req as AuthenticatedRequest).userId = userId;
    authorizerLogger.info(
      "Found userId: ",
      chalk.cyan(userId),
      " for cognitoId: ",
      chalk.cyan(result.sub),
    );
    next();
  } catch (error: any) {
    authorizerLogger.error(error);
    res.status(401).send({ error: "Unauthorized" });
  }
};

/**
 * Looks up a user id from the db using cognito id.
 * @param cognitoId the id from cognito
 * @returns user id or null
 */
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

/**
 * Checks the redis cache for user id using cognito id.
 * @param cognitoId the id from cognito
 * @returns user id or null
 */
async function getCachedUserId(cognitoId: string): Promise<number | null> {
  return await getCacheItem<number>(userIdCognitoIdCacheKey(cognitoId));
}
