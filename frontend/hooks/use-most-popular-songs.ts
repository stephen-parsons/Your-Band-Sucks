import { ProfileSong, UserService } from "@/service/user";
import { useEffect, useState } from "react";

interface UseMostPopularSongsArgs {
  enabled: boolean;
  service: UserService;
}

export default function useMostPopularSongs({
  enabled,
  service,
}: UseMostPopularSongsArgs) {
  const [songs, setSongs] = useState<ProfileSong[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSongs(): Promise<void> {
      try {
        console.info("Fetching most popular songs...");
        setIsLoading(true);
        const result = await service.getMostPopularSongs();
        setSongs(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (enabled && songs === null && !error) fetchSongs();
  }, [enabled, songs, error, service]);

  return { songs, isLoading, error };
}
