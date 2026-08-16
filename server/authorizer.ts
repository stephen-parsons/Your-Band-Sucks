import chalk from "chalk";
import { RequestHandler } from "express";
import { AuthenticatedRequest } from ".";
import { resolveUserIdFromAccessToken } from "./auth/resolveUser";
import { moduleLogger } from "./util/logger";

/**
 * Paths that do not require a user to exist in the db, only cognito authorization.
 **/
const unauthorizedPaths = ["/current", "/new"];

export const authorizerLogger = moduleLogger("authorizer", { devOnly: false });

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
    const { cognitoId, userId } = await resolveUserIdFromAccessToken(token);
    (req as AuthenticatedRequest).cognitoId = cognitoId;

    if (!userId) {
      if (unauthorizedPaths.includes(req.path)) {
        authorizerLogger.info(
          "Skipping userId lookup for cognitoId: ",
          cognitoId,
        );
        return next();
      }
      throw new Error("No user found!!!");
    }

    (req as AuthenticatedRequest).userId = userId;
    authorizerLogger.info(
      "Found userId: ",
      chalk.cyan(userId),
      " for cognitoId: ",
      chalk.cyan(cognitoId),
    );
    next();
  } catch (error: unknown) {
    authorizerLogger.error(error);
    res.status(401).send({ error: "Unauthorized" });
  }
};
