import "dotenv/config";
import { ExpoConfig } from "expo/config";

export default (config: ExpoConfig) => ({
  ...config,
  extra: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.COGNITO_CLIENT_ID,
  },
});
