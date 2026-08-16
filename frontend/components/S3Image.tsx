import usePresignedUrl from "@/hooks/use-presigned-url";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ImageStyle, StyleProp, StyleSheet, View } from "react-native";

const { imagesBucket } = Constants.expoConfig?.extra || {};

if (!imagesBucket) throw new Error("Missing s3 images bucket config");

interface S3ImageProps {
  style: StyleProp<ImageStyle>;
  source: string;
}

export default function S3Image({ style, source }: S3ImageProps) {
  const { url, error } = usePresignedUrl(imagesBucket, source);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [source]);

  const iconSize = useMemo(() => {
    const flattened = StyleSheet.flatten(style);
    const width = typeof flattened?.width === "number" ? flattened.width : 40;
    return Math.max(16, Math.round(width * 0.5));
  }, [style]);

  if (error || loadError) {
    return (
      <View style={[styles.broken, style]}>
        <MaterialCommunityIcons
          name="image-broken-variant"
          size={iconSize}
          color="#999"
        />
      </View>
    );
  }

  if (!url) return null;

  return (
    <Image
      source={{ uri: url, cacheKey: source }}
      style={style}
      onError={() => setLoadError(true)}
    />
  );
}

const styles = StyleSheet.create({
  broken: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
});
