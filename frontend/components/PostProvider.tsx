import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

//todo: move to config
//same in express app
export const SERVER_URL = "http://localhost:3000";

export interface Post {
  id: string;
  link: string;
  title: string;
  description: string;
  image?: string;
  tags: string[];
  avatar?: string;
  user: string;
}

export type Posts = Post[];

interface IPostContext {
  posts: Posts | null;
  isLoading: boolean;
  error?: boolean;
}

const PostContext = createContext<IPostContext>({
  posts: null,
  isLoading: false,
});

export function PostContextProvider({ children }: PropsWithChildren) {
  const [posts, setPosts] = useState<IPostContext["posts"]>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    async function fetchFeed() {
      try {
        setIsLoading(true);
        const result = await fetch(`${SERVER_URL}/feed`);
        const postsJson = (await result.json()) as Posts;
        setPosts(postsJson);
        setIsLoading(false);
      } catch (e) {
        setError(true);
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
