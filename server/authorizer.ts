import { RequestHandler } from "express";
import { AuthenticatedRequest } from ".";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./service/CognitoService";

const unauthorizedPaths = ["/current", "/new"];

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

    //don't check for the app userId if creating a new account
    if (unauthorizedPaths.includes(req.path)) {
      console.info("Skipping userId lookup for cognitoId: ", result.sub);
      return next();
    }

    const user = await prisma.user.findFirst({
      where: {
        cognitoId: result.sub,
      },
      select: {
        id: true,
      },
    });
    if (!user || user === null) throw new Error("No user found!!!");

    //add the userId to the request
    (req as AuthenticatedRequest).userId = user.id;
    console.log("Found userId and cognitoId: ", user.id, result.sub);
    next();
  } catch (error: any) {
    console.error(error);
    res.status(401).send({ error: "Unauthorized" });
  }
};
