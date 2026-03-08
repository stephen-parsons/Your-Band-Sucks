import { Post, updateLikeStatus } from "@/service/posts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface LikeButtonProps {
  initial: Post["liked"];
  songId: Post["id"];
  userId: number;
}

function LikeButtonComponent({ initial, songId, userId }: LikeButtonProps) {
  const liked = useSharedValue(initial ? 1 : 0);

  const outlineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(liked.value, [0, 1], [1, 0], Extrapolation.CLAMP),
        },
      ],
    };
  }, [liked]);

  const fillStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: liked.value }],
      opacity: liked.value,
    };
  }, [liked]);

  return (
    <Pressable
      onPress={() => {
        //debounce
        if (liked.value === 1 || liked.value === 0) {
          //if 0, they are liking.
          updateLikeStatus({ liked: liked.value === 0, userId, songId });
          liked.value = withSpring(liked.value ? 0 : 1);
        }
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, outlineStyle]}>
        <MaterialCommunityIcons
          name={"heart-outline"}
          size={32}
          color={"white"}
        />
      </Animated.View>

      <Animated.View style={fillStyle}>
        <MaterialCommunityIcons name={"heart"} size={32} color={"red"} />
      </Animated.View>
    </Pressable>
  );
}

export const LikeButton = memo(LikeButtonComponent);
