#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { MainBackendStack } from "../lib/main-backend-stack";
import { loadEnvFile, requireEnv, SERVER_ENV_PATH } from "../lib/env";

loadEnvFile(SERVER_ENV_PATH);

const app = new cdk.App();

new MainBackendStack(app, "YourBandSucksBackend", {
  env: {
    account: requireEnv("AWS_ACCOUNT_ID"),
    region: requireEnv("AWS_REGION"),
  },
  terminationProtection: true,
  description: "YourBandSucks backend",
});
