import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

//todo: move to config?
const REGION = "use-west-1";
const BUCKET = "942909611242-audio-files";
//in seconds
const URL_EXPIRATION = 3600;

interface PreSignedUrlRequestParams {
  key: string;
}

export async function createPresignedUrlWithClient({
  key,
}: PreSignedUrlRequestParams): Promise<string> {
  try {
    const client = new S3Client({ region: REGION });
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
    return await getSignedUrl(client, command, { expiresIn: URL_EXPIRATION });
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}
