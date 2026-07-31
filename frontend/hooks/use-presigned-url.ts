import { getUrl } from "aws-amplify/storage";
import { useEffect, useState } from "react";

const DEFAULT_PRESIGNED_URL_EXPIRATION = 3600;

export default function usePresignedUrl(
  bucket: string,
  key: string,
  expiration?: number,
) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function getPresignedUrl(key: string) {
      try {
        setIsLoading(true);
        const url = await getUrl({
          path: key,
          options: {
            bucket,
            // Optional: validate existence and customize URL expiry
            validateObjectExistence: true, // Check if the object exists
            expiresIn: expiration || DEFAULT_PRESIGNED_URL_EXPIRATION,
          },
        });
        setIsLoading(false);
        setUrl(url.url.toString());
      } catch (e) {
        console.error(e);
        setError(e as Error);
        setIsLoading(false);
      }
    }
    if (key && !url && !isLoading && !error) getPresignedUrl(key);
  }, [error, url, isLoading]);

  return { url, error, isLoading };
}
