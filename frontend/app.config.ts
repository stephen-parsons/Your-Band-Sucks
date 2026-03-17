import "dotenv/config";
import { ExpoConfig } from "expo/config";

export default (config: ExpoConfig) => ({
  ...config,
  extra: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    userPoolClientId: process.env.COGNITO_CLIENT_ID,
    identityPoolId: process.env.IDENTITY_POOL_ID,
    awsRegion: process.env.AWS_REGION,
    imagesBucket: process.env.S3_IMAGES_BUCKET,
    audioFilesBucket: process.env.S3_AUDIO_FILES_BUCKET,
  },
});
