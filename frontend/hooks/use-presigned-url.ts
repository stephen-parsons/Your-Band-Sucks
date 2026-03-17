import { getUrl } from "aws-amplify/storage";
import Constants from "expo-constants";
import { useEffect, useState } from "react";

const { audioFilesBucket } = Constants.expoConfig?.extra || {};

if (!audioFilesBucket) throw new Error("bad s3 bucket config!!");

export default function usePresignedUrl(key: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function getPresignedUrl(key: string) {
      try {
        setIsLoading(true);
        const url = await getUrl({
          path: key,
          options: {
            bucket: audioFilesBucket as string,
            // Optional: validate existence and customize URL expiry
            validateObjectExistence: true, // Check if the object exists
            expiresIn: 60 * 60, // URL valid for 1 hour
          },
        });
        setIsLoading(false);
        setUrl(url.url.toString());
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      }
    }
    console.log(key, url, isLoading);
    if (key && !url && !isLoading) getPresignedUrl(key);
  }, [url, isLoading]);

  return { url };
}
