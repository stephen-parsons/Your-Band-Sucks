import { getUrl } from "aws-amplify/storage";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ImageStyle, StyleProp } from "react-native";

const { imagesBucket } = Constants.expoConfig?.extra || {};

if (!imagesBucket) throw new Error("Missing s3 images bucket config");

export default function S3Image({
  style,
  source,
}: {
  style: StyleProp<ImageStyle>;
  source: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    async function getImageFromS3(source: string) {
      try {
        setIsLoading(true);
        const url = await getUrl({
          path: source,
          options: {
            bucket: imagesBucket as string,
            // Optional: validate existence and customize URL expiry
            validateObjectExistence: true, // Check if the object exists
            expiresIn: 60 * 60, // URL valid for 1 hour
          },
        });
        setIsLoading(false);
        setImage(url.url.toString());
      } catch (e) {
        setIsLoading(false);
        setError(e as Error);
        console.error(e);
      }
    }
    if (source && !image && !isLoading && !error) getImageFromS3(source);
  }, [source, image, isLoading]);

  return (
    <>
      {image && (
        <Image source={{ uri: image, cacheKey: source }} style={style} />
      )}
    </>
  );
}
