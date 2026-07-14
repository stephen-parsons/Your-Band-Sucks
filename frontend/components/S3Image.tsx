import { getUrl } from "aws-amplify/storage";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ImageStyle, StyleProp } from "react-native";

const { imagesBucket } = Constants.expoConfig?.extra || {};

if (!imagesBucket) throw new Error("bad s3 bucket config!!");

const localCache = new Map<string, string>();

export default function S3Image({
  style,
  source,
}: {
  style: StyleProp<ImageStyle>;
  source: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
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
      }
    }
    if (source && !image && !isLoading) getImageFromS3(source);
  }, [source, image, isLoading]);

  return (
    <>
      {image && (
        <Image source={{ uri: image, cacheKey: source }} style={style} />
      )}
    </>
  );
}
