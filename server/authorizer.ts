import { RequestHandler } from "express";
import { AuthenticatedRequest } from ".";
import { prisma } from "./prisma";
import { verifyAccessToken } from "./service/CognitoService";

export const cognitoAuthorizer: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized: Missing token");
  }

  const token = authHeader.split(" ")[1];

  try {
    const result = await verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: {
        cognitoId: result.sub,
      },
      select: {
        id: true,
      },
    });
    if (!user) throw new Error("No user found!!!");
    //add the queried userId to the req object
    (req as AuthenticatedRequest).userId = user.id;
    console.log("Found user: " + user.id);
    next(); // Token is valid, proceed to the next handler
  } catch (error: any) {
    res.status(401).send({ error: error.message });
  }
};
