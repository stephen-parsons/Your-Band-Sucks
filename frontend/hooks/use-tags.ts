import { useAuthContext } from "@/app/auth";
import { usePostContext } from "@/components/PostProvider";
import { Tag } from "@/service/posts";
import { useEffect, useState } from "react";

export default function useTags() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const isAuthenticated = useAuthContext();

  const { service } = usePostContext();

  useEffect(() => {
    async function fetchTags() {
      try {
        console.info("Fetching tags...");
        setIsLoading(true);
        const result = await service.getTags();
        setTags(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (isAuthenticated && tags === null) fetchTags();
  }, [tags, isAuthenticated, service]);

  return { tags, isLoading, error };
}
