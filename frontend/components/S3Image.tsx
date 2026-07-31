import usePresignedUrl from "@/hooks/use-presigned-url";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { ImageStyle, StyleProp, Text } from "react-native";

const { imagesBucket } = Constants.expoConfig?.extra || {};

if (!imagesBucket) throw new Error("Missing s3 images bucket config");

export default function S3Image({
  style,
  source,
}: {
  style: StyleProp<ImageStyle>;
  source: string;
}) {
  const { url, error } = usePresignedUrl(imagesBucket, source);

  return (
    <>
      {error && (
        <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
          {error?.message}
        </Text>
      )}
      {url && <Image source={{ uri: url, cacheKey: source }} style={style} />}
    </>
  );
}
