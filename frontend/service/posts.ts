import { ApiService, SERVER_URL } from "@/service/ApiService";
import { User } from "@/service/user";

export { SERVER_URL };

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
   * Whether or not the song has been liked or disliked.
   * `undefined` if song has no like/dislike status.
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

export class PostService extends ApiService {
  private updateLikeStatusState?: (id: number, status: Like) => void;

  constructor(
    apiClient: typeof fetch,
    updateLikeStatusState?: (id: number, status: Like) => void,
  ) {
    super(apiClient);
    this.updateLikeStatusState = updateLikeStatusState;
  }

  public async getMostPopularPosts(): Promise<Posts> {
    return this.fetch<Posts>("/posts/most-liked");
  }

  public async getLeastPopularPosts(): Promise<Posts> {
    return this.fetch<Posts>("/posts/least-liked");
  }

  //todo: pagination
  public async getPosts(): Promise<Posts> {
    return this.fetch<Posts>("/posts");
  }

  public async getTags(): Promise<Tag[]> {
    return this.fetch<Tag[]>("/tags");
  }

  public async getPresignedUrl({
    filename,
    contentType,
  }: GetPresignedUrlBody): Promise<PresignedResponse> {
    return this.fetch<PresignedResponse>("/posts/pre-signed-url", {
      method: "POST",
      body: JSON.stringify({
        filename,
        contentType,
      }),
    });
  }

  public async createNewPost({
    title,
    description,
    tags,
    key,
  }: CreateNewPostBody): Promise<unknown> {
    return this.fetch<unknown>("/posts/new", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        tags,
        key,
      }),
    });
  }

  public async updateLikeStatus({
    liked,
    songId,
  }: LikeRequestBody): Promise<unknown> {
    const data = await this.fetch<unknown>("/posts/like", {
      method: "POST",
      body: JSON.stringify({
        liked,
        songId,
      }),
    });
    this.updateLikeStatusState?.(songId, liked ? "like" : "dislike");
    return data;
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
