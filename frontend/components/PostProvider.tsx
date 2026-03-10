import { getPosts, Posts } from "@/service/posts";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

export interface User {
  name: string;
  id: number;
  avatar?: string;
}

interface IPostContext {
  posts: Posts | null;
  isLoading: boolean;
  error: Error | null;
}

const PostContext = createContext<IPostContext>({
  posts: null,
  isLoading: false,
  error: null,
});

export function PostContextProvider({ children }: PropsWithChildren) {
  const [posts, setPosts] = useState<IPostContext["posts"]>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFeed() {
      try {
        console.info("Fetching posts...");
        setIsLoading(true);
        const result = await getPosts();
        setPosts(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (posts === null) fetchFeed();
  }, [posts]);

  return (
    <PostContext.Provider value={{ posts, isLoading, error }}>
      {children}
    </PostContext.Provider>
  );
}

export const usePostContext = (): IPostContext => {
  const context = useContext(PostContext);

  if (!context) {
    throw new Error("usePostContext must be used within PostContextProvider");
  }

  return context;
};
