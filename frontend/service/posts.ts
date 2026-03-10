import { User } from "@/components/PostProvider";
import { config } from "@/config";

export const SERVER_URL = config.server.baseUrl;

export interface PresignedResponse {
  url: string;
}

export interface GetPresignedUrlBody {
  userId: number;
  filename: string;
  contentType?: string;
}

export interface UploadToS3Body {
  presignedUrl: string;
  mimeType?: string;
  blob: Blob;
}

export interface CreateNewPostBody {
  title: string;
  description: string;
  //object key for S3
  key: string;
  userId: number;
  tags: string[];
}

interface Tag {
  description: string;
}

export interface Post {
  id: number;
  url: string;
  title: string;
  description: string;
  image?: string;
  tags: Tag[];
  avatar?: string;
  user: User;
  /**
   * Whether or not the song has been liked or disliked
   * Undefined if song has no like/dislike status
   */
  like?: Like;
}

export type Like = "like" | "dislike";

export type Posts = Post[];

//todo: fetch based on userId to get personalized feed
//todo: pagination
export async function getPosts() {
  const result = await fetch(`${SERVER_URL}/posts`);
  return (await result.json()) as Posts;
}

export async function getPresignedUrl({
  userId,
  filename,
  contentType,
}: GetPresignedUrlBody): Promise<string> {
  const res = await fetch(`${SERVER_URL}/posts/pre-signed-url`, {
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

export async function createNewPost({
  userId,
  title,
  description,
  tags,
  key,
}: CreateNewPostBody) {
  const res = await fetch(`${SERVER_URL}/posts/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      title,
      description,
      tags,
      key,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to get presigned URL");
  }
  return await res.json();
}

interface LikeRequestBody {
  userId: number;
  liked: boolean;
  songId: number;
}

export async function updateLikeStatus({
  userId,
  liked,
  songId,
}: LikeRequestBody) {
  const res = await fetch(`${SERVER_URL}/posts/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      liked,
      userId,
      songId,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to updates like status");
  }
  return await res.json();
}
