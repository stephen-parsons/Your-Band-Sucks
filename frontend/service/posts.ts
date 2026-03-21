import { User } from "@/components/PostProvider";
import Constants from "expo-constants";

export const SERVER_URL = Constants.expoConfig?.extra?.["apiUrl"];

export interface PresignedResponse {
  url: string;
  objectKey: string;
}

export interface GetPresignedUrlBody {
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
  tags: string[];
}

export interface Tag {
  id: string;
  description: string;
  count?: number;
}

export interface Post {
  id: number;
  /**
   * Presigned s3 url from the server
   */
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

interface LikeRequestBody {
  liked: boolean;
  songId: number;
}

export type Like = "like" | "dislike";

export type Posts = Post[];

export class PostService {
  public apiClient;
  constructor(apiClient: typeof fetch) {
    this.apiClient = apiClient;
  }

  public async getMostPopularPosts() {
    const result = await this.apiClient(`${SERVER_URL}/posts/most-liked`);
    return (await result.json()) as Posts;
  }

  public async getLeastPopularPosts() {
    const result = await this.apiClient(`${SERVER_URL}/posts/least-liked`);
    return (await result.json()) as Posts;
  }

  //todo: pagination
  public async getPosts() {
    const result = await this.apiClient(`${SERVER_URL}/posts`);
    return (await result.json()) as Posts;
  }

  public async getTags() {
    const result = await this.apiClient(`${SERVER_URL}/tags`);
    return (await result.json()) as Tag[];
  }

  public async getPresignedUrl({
    filename,
    contentType,
  }: GetPresignedUrlBody): Promise<PresignedResponse> {
    const res = await this.apiClient(`${SERVER_URL}/posts/pre-signed-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename,
        contentType,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const data: PresignedResponse = await res.json();
    return data;
  }

  public async createNewPost({
    title,
    description,
    tags,
    key,
  }: CreateNewPostBody) {
    const res = await this.apiClient(`${SERVER_URL}/posts/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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

  public async updateLikeStatus({ liked, songId }: LikeRequestBody) {
    const res = await this.apiClient(`${SERVER_URL}/posts/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        liked,
        songId,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to update like status");
    }
    return await res.json();
  }
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
