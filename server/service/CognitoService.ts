import { CognitoJwtVerifier } from "aws-jwt-verify";

if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID)
  throw new Error("Missing required cognito env variables");

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access", // Must be 'access' for access tokens
  clientId: process.env.COGNITO_CLIENT_ID,
});

export async function verifyAccessToken(token: string) {
  try {
    const payload = await verifier.verify(token);
    console.log("Token is valid. Payload:", payload);
    return payload;
  } catch (error) {
    console.error("Token invalid:", error);
    throw new Error("Unauthorized");
  }
}
