import { config } from "@/config";

export const SERVER_URL = config.server.baseUrl;

export interface PresignedResponse {
  url: string;
}

export interface GetPresignedUrlBody {
  userId: string;
  filename: string;
}

export interface UploadToS3Body {
  presignedUrl: string;
  mimeType?: string;
  blob: Blob;
}

export interface CreateNewPostBody {
  title: string;
  description: string;
  url: string;
  userId: string;
  tags: string[];
}

export async function getPresignedUrl({
  userId,
  filename,
}: GetPresignedUrlBody): Promise<string> {
  const res = await fetch(`${SERVER_URL}/posts/pre-signed-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      filename,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get presigned URL");
  }

  const data: PresignedResponse = await res.json();
  return data.url;
}

export async function uploadToS3({
  presignedUrl,
  mimeType,
  blob,
}: UploadToS3Body) {
  return await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType || "application/octet-stream",
    },
    body: blob,
  });
}

export async function createNewPost({
  userId,
  title,
  description,
  tags,
  url,
}: CreateNewPostBody) {
  const res = await fetch(`${SERVER_URL}/posts/pre-signed-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      title,
      description,
      tags,
      url,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get presigned URL");
  }
  return await res.json();
}
