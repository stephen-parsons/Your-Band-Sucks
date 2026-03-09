import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config";

//todo: move to config?
const REGION = config.aws.region;
const BUCKET = config.aws.bucket;
//in seconds
const URL_EXPIRATION = 3600;

interface PreSignedUrlRequestParams {
  key: string;
  contentType: string;
}

export async function createPresignedUrlWithClient({
  key,
  contentType,
}: PreSignedUrlRequestParams): Promise<string> {
  try {
    const client = new S3Client({ region: REGION });
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(client, command, { expiresIn: URL_EXPIRATION });
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}
