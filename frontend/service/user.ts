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
  //key for s3 object in images bucket
  key: string;
}

export class UserService {
  private apiClient;
  constructor(apiClient: typeof fetch) {
    this.apiClient = apiClient;
  }

  public async getUserProfile() {
    const result = await this.apiClient(`${SERVER_URL}/users/current`);
    return (await result.json()) as UserProfile;
  }

  public async getPresignedUrl({
    filename,
    contentType,
  }: GetPresignedUrlBody): Promise<PresignedResponse> {
    const res = await fetch(`${SERVER_URL}/users/avatar/pre-signed-url`, {
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

  public async createNewAvatar({ key }: CreateNewAvatarBody) {
    const res = await fetch(`${SERVER_URL}/users/avatar/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create new avatar");
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
