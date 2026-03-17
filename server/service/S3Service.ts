import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../config";

export const REGION = config.aws.region;
export const BUCKETS = config.aws.bucket;
//in seconds
const URL_EXPIRATION = 3600;

interface PreSignedUrlRequestParams extends S3RequestParams {
  contentType?: string;
}

interface S3RequestParams {
  key: string;
  contentType?: string;
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS];
}

export async function createPresignedUrlWithClientPUT({
  bucket,
  key,
  contentType,
}: PreSignedUrlRequestParams): Promise<string> {
  try {
    const client = new S3Client({ region: REGION });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(client, command, { expiresIn: URL_EXPIRATION });
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}

export async function createPresignedUrlWithClientGET({
  bucket,
  key,
}: PreSignedUrlRequestParams): Promise<string> {
  try {
    const client = new S3Client({ region: REGION });
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await getSignedUrl(client, command, { expiresIn: URL_EXPIRATION });
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}

export async function deleteS3Object({
  bucket,
  key,
}: S3RequestParams): Promise<void> {
  try {
    const client = new S3Client({ region: REGION });
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}

export function generateS3Url(bucket: string, key: string) {
  return `https://${bucket}.s3.${REGION}.amazonaws.com/${key}`;
}
