import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import "dotenv/config";
import { parseArgs, ParseArgsOptionsConfig } from "node:util";

const options: ParseArgsOptionsConfig = {
  silent: { type: "boolean", short: "s" },
  fetchIdentityCredentials: { type: "boolean", default: false },
};

const { values } = parseArgs({ options, strict: false });

const {
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  COGNITO_TEST_USER_NAME,
  COGNITO_TEST_USER_PASSWORD,
  COGNITO_IDENTITY_POOL_ID,
  AWS_REGION,
} = process.env;

if (
  !COGNITO_USER_POOL_ID ||
  !COGNITO_CLIENT_ID ||
  !COGNITO_TEST_USER_NAME ||
  !COGNITO_TEST_USER_PASSWORD ||
  !COGNITO_IDENTITY_POOL_ID ||
  !AWS_REGION
)
  throw new Error("Missing required env vars");

// Configuration variables
const poolData = {
  UserPoolId: COGNITO_USER_POOL_ID, // e.g., us-east-1_xxxxxxxxx
  ClientId: COGNITO_CLIENT_ID,
};

const username = COGNITO_TEST_USER_NAME;
const password = COGNITO_TEST_USER_PASSWORD;

// Initialize the User Pool object
const userPool = new CognitoUserPool(poolData);

// Initialize the User object
const cognitoUser = new CognitoUser({
  Username: username,
  Pool: userPool,
});

// Configure the authentication details
const authenticationDetails = new AuthenticationDetails({
  Username: username,
  Password: password,
});

export default async function getBearerAuthToken() {
  console.log("Initiating SRP Authentication...");

  // Execute the authentication flow
  const token = new Promise<string>((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: async (result) => {
        if (Boolean(values.silent)) {
          resolve(result.getAccessToken().getJwtToken());
          return;
        }

        console.log("\n--- AUTHENTICATION SUCCESSFUL ---\n");

        // Print tokens to the terminal
        console.log("ID Token:");
        console.log(result.getIdToken().getJwtToken());

        console.log("\nAccess Token:");
        console.log(result.getAccessToken().getJwtToken());

        console.log("\nRefresh Token:");
        console.log(result.getRefreshToken().getToken());

        if (Boolean(!values.fetchIdentityCredentials)) {
          const idToken = result.getIdToken().getJwtToken();

          const identityClient = new CognitoIdentityClient({
            region: AWS_REGION,
          });

          try {
            const loginKey = `cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

            const idResponse = await identityClient.send(
              new GetIdCommand({
                IdentityPoolId: COGNITO_IDENTITY_POOL_ID,
                Logins: { [loginKey]: idToken },
              }),
            );

            const credentialsResponse = await identityClient.send(
              new GetCredentialsForIdentityCommand({
                IdentityId: idResponse.IdentityId,
                Logins: { [loginKey]: idToken },
              }),
            );

            console.log("\n--- AWS CREDENTIALS GENERATED ---");
            console.log(
              "These credentials possess the permissions of your IAM Role:",
            );
            console.log(
              "Access Key ID:",
              credentialsResponse?.Credentials?.AccessKeyId,
            );
            console.log(
              "Secret Access Key:",
              credentialsResponse?.Credentials?.SecretKey,
            );
            console.log(
              "Session Token:",
              credentialsResponse?.Credentials?.SessionToken,
            );
          } catch (error) {
            console.error("Failed to fetch Identity Pool credentials:", error);
          }
        }

        process.exit(0);
      },

      onFailure: (err) => {
        console.error("\n--- AUTHENTICATION FAILED ---");
        console.error(err.message || JSON.stringify(err));
        process.exit(1);
      },

      mfaRequired: (challengeName, challengeParameters) => {
        console.log(`\nMFA Required: ${challengeName}`);
        console.log(
          "Your user pool requires MFA. Further handling is required.",
        );
        // You would use cognitoUser.sendMFACode(mfaCode, this) here
        process.exit(0);
      },
    });
  });

  return await token;
}
