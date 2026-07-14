import { useAuthContext } from "@/app/auth";
import { Posts, PostService } from "@/service/posts";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AudioProvider from "../audio/AudioManager";

export interface User {
  name: string;
  email: string;
  id: number;
  avatar?: string;
}

interface IPostContext {
  posts: Posts | null;
  isLoading: boolean;
  error: Error | null;
  service: PostService;
}

const PostContext = createContext<IPostContext>({
  posts: null,
  isLoading: false,
  error: null,
  service: new PostService(fetch),
});

export function PostContextProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, apiClient } = useAuthContext();
  const [posts, setPosts] = useState<IPostContext["posts"]>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const service = useMemo(() => new PostService(apiClient), [apiClient]);

  useEffect(() => {
    async function fetchFeed() {
      try {
        console.info("Fetching posts...");
        setIsLoading(true);
        const result = await service.getPosts();
        setPosts(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (isAuthenticated && posts === null && !isLoading) fetchFeed();
  }, [posts, isAuthenticated, service]);

  useEffect(() => {
    //pre-load audio buffers
    try {
      const promises =
        posts &&
        posts?.map(async (post) => {
          if (!AudioProvider.hasAudioBuffer(post.id)) {
            AudioProvider.preloadAudioBuffer(post.id, post.url);
          }
        });
      //prioritize first buffer
      //debounce in case user starts aplying a currently loading buffer?
      promises?.length &&
        Promise.all(promises).then(() => console.info("Buffers preloaded!"));
    } catch (e: any) {
      console.error("Couldn't pre-load audio buffers: ", e.message);
    }
  }, [posts]);

  return (
    <PostContext.Provider value={{ posts, isLoading, error, service }}>
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
