import { User } from "@/components/PostProvider";
import { config } from "@/config";

const SERVER_URL = config.server.baseUrl;

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

export interface Tag {
  id: string;
  description: string;
  count?: number;
}

export interface Post {
  id: number;
  url: string;
  title: string;
  description: string;
  image?: string;
  tags: Tag[];
  user: User;
  /**
   * Whether or not the song has been liked or disliked
   * Undefined if song has no like/dislike status
   */
  like?: Like;
  likeCount: number;
}

export type Like = "like" | "dislike";

export type Posts = Post[];

export async function getMostPopularPosts() {
  const result = await fetch(`${SERVER_URL}/posts/most-liked`);
  return (await result.json()) as Posts;
}

export async function getLeastPopularPosts() {
  const result = await fetch(`${SERVER_URL}/posts/least-liked`);
  return (await result.json()) as Posts;
}

//todo: fetch based on userId to get personalized feed
//todo: pagination
export async function getPosts(client: typeof fetch) {
  const result = await client(`${SERVER_URL}/posts`);
  return (await result.json()) as Posts;
}

export async function getTags() {
  const result = await fetch(`${SERVER_URL}/tags`);
  return (await result.json()) as Tag[];
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
    throw new Error("Failed to create new post");
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
