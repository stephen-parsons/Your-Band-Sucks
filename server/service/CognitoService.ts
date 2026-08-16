import { CognitoJwtVerifier } from "aws-jwt-verify";
import { CognitoIdTokenPayload } from "aws-jwt-verify/jwt-model";
import { moduleLogger } from "../util/logger";

const cognitoLogger = moduleLogger("CognitoService");

if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID)
  throw new Error("Missing required cognito env variables");

const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access", // Must be 'access' for access tokens
  clientId: process.env.COGNITO_CLIENT_ID,
});

const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

export type IdTokenClaimsPayload = CognitoIdTokenPayload & {
  email: string;
  name: string;
  usename: string;
};

export async function verifyAccessToken(token: string) {
  try {
    const payload = await accessTokenVerifier.verify(token);
    cognitoLogger.info("Token is valid. Payload:", payload);
    return payload;
  } catch (error) {
    cognitoLogger.error("Token invalid:", error);
    throw new Error("Unauthorized: " + error);
  }
}

export async function verifyIdToken(token: string) {
  try {
    const payload = await idTokenVerifier.verify(token);
    cognitoLogger.info("Token is valid. Payload:", payload);
    return payload;
  } catch (error) {
    cognitoLogger.error("Token invalid:", error);
    throw new Error("Unauthorized: " + error);
  }
}
