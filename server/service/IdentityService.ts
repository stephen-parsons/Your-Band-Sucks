const { IAM_USER_AWS_ACCESS_KEY_ID, IAM_USER_AWS_SECRET_ACCESS_KEY } =
  process.env;

if (!IAM_USER_AWS_ACCESS_KEY_ID || !IAM_USER_AWS_SECRET_ACCESS_KEY)
  throw new Error("Missing required AWS credentials");

/**
 * Service module credentials for backend API.
 * These are long running credentials are for an IAM User.
 */
export const credentials = {
  accessKeyId: process.env.IAM_USER_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.IAM_USER_AWS_SECRET_ACCESS_KEY!,
};
