import { User } from "@/components/PostProvider";
import { config } from "@/config";
import { Posts, Tag } from "./posts";

export const SERVER_URL = config.server.baseUrl;

export interface UserProfile extends User {
  songs: Posts;
  tags: Tag[];
}

export async function getUserProfile(id: number) {
  if (typeof id !== "number") throw new Error("Dont mess with my API!");
  const result = await fetch(`${SERVER_URL}/users/${id}`);
  return (await result.json()) as UserProfile;
}
