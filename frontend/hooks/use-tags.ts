import { getTags, Tag } from "@/service/posts";
import { useEffect, useState } from "react";

export default function useTags() {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTags() {
      try {
        console.info("Fetching tags...");
        setIsLoading(true);
        const result = await getTags();
        setTags(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (tags === null) fetchTags();
  }, [tags]);

  return { tags, isLoading, error };
}
