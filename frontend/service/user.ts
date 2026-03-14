import { User } from "@/components/PostProvider";
import { config } from "@/config";
import {
  GetPresignedUrlBody,
  Posts,
  PresignedResponse,
  Tag,
  UploadToS3Body,
} from "./posts";

export const SERVER_URL = config.server.baseUrl;

export interface UserProfile extends User {
  songs: Posts;
  tags: Tag[];
}

interface CreateNewAvatarBody {
  userId: number;
  //key for s3 object in images bucket
  key: string;
}

export async function getUserProfile(id: number) {
  if (typeof id !== "number") throw new Error("Dont mess with my API!");
  const result = await fetch(`${SERVER_URL}/users/${id}`);
  return (await result.json()) as UserProfile;
}

export async function getPresignedUrl({
  userId,
  filename,
  contentType,
}: GetPresignedUrlBody): Promise<string> {
  const res = await fetch(`${SERVER_URL}/users/avatar/pre-signed-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      filename,
      contentType,
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

export async function createNewAvatar({ userId, key }: CreateNewAvatarBody) {
  const res = await fetch(`${SERVER_URL}/users/avatar/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      key,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create new avatar");
  }
  return await res.json();
}
