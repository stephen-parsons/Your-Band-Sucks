import { useAuthContext } from "@/app/auth";
import { Like, Posts, PostService } from "@/service/posts";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AudioProvider from "../audio/AudioManager";

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

  /**
   * Update the like status in the ui.
   * This prevents having to re-fetch posts when like status changes.
   */
  const updateLikeStatus = useCallback(
    (id: number, status: Like) => {
      if (!posts) return;
      const newPosts = [...posts];
      const newPost = newPosts.find((post) => post.id === id);
      if (!newPost) return;
      newPost.like = status;
      setPosts(newPosts);
    },
    [posts],
  );

  const service = useMemo(
    () => new PostService(apiClient, updateLikeStatus),
    [apiClient, updateLikeStatus],
  );

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
    //pre-load audio buffers in order
    try {
      if (posts) {
        posts?.forEach(async (post) => {
          if (!AudioProvider.hasAudioBuffer(post.id)) {
            await AudioProvider.preloadAudioBuffer(post.id, post.url);
          }
        });
      }
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
