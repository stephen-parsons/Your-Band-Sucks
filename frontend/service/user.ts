import { ApiService } from "@/service/ApiService";
import {
  GetPresignedUrlBody,
  Posts,
  PresignedResponse,
  Tag,
  UploadToS3Body,
} from "./posts";

export interface User {
  name: string;
  email: string;
  id: number;
  avatar?: string;
}

export interface ProfileSong {
  id: number;
  title: string;
  likeCount: number;
}

export interface UserProfile extends User {
  songs: Posts;
  tags: Tag[];
}

interface CreateNewAvatarBody {
  //key for s3 object in images bucket
  key: string;
}

export class UserService extends ApiService {
  constructor(apiClient: typeof fetch) {
    super(apiClient);
  }

  public async getUserProfile(): Promise<UserProfile> {
    return this.fetch<UserProfile>("/users/current");
  }

  public async getMostPopularSongs(): Promise<ProfileSong[]> {
    return this.fetch<ProfileSong[]>("/users/current/popular-songs");
  }

  public async getRecentlyLikedSongs(): Promise<ProfileSong[]> {
    return this.fetch<ProfileSong[]>("/users/current/liked-songs");
  }

  public async createNewUser(idToken: string): Promise<User> {
    return this.fetch<User>("/users/new", {
      method: "POST",
      body: JSON.stringify({
        idToken,
      }),
    });
  }

  public async getPresignedUrl({
    filename,
    contentType,
  }: GetPresignedUrlBody): Promise<PresignedResponse> {
    return this.fetch<PresignedResponse>("/users/avatar/pre-signed-url", {
      method: "POST",
      body: JSON.stringify({
        filename,
        contentType,
      }),
    });
  }

  public async createNewAvatar({ key }: CreateNewAvatarBody): Promise<unknown> {
    return this.fetch<unknown>("/users/avatar/update", {
      method: "POST",
      body: JSON.stringify({
        key,
      }),
    });
  }

  public async deleteAvatar(): Promise<unknown> {
    return this.fetch<unknown>("/avatar/update/delete", {
      method: "POST",
    });
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
