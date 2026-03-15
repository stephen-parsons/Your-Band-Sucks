import { Post } from "@/service/posts";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { usePostContext } from "../PostProvider";

interface LikeBarProps {
  like: Post["like"];
  songId: Post["id"];
}

interface LikeButtonProps {
  songId: Post["id"];
  //like or dislike button
  variant: Post["like"];
  liked: SharedValue<number>;
  //whether ot not the user ahs already voted on this song
  voted: LikeBarProps["like"];
  setVoted: (like: LikeBarProps["like"]) => void;
}

function LikeButtonComponent({
  songId,
  variant,
  liked,
  voted,
  setVoted,
}: LikeButtonProps) {
  const { service } = usePostContext();
  const [pressed, setPressed] = useState<boolean>(typeof voted !== "undefined");
  const outlineStyle = useAnimatedStyle(() => {
    const value = calculateSharedValueBasedOnVariant(
      liked.value,
      variant,
      pressed,
    );
    return {
      transform: [
        {
          scale: interpolate(value, [0, 1], [1, 0], Extrapolation.CLAMP),
        },
      ],
    };
  }, [liked, pressed]);

  const fillStyle = useAnimatedStyle(() => {
    const value = calculateSharedValueBasedOnVariant(
      liked.value,
      variant,
      pressed,
    );
    return {
      transform: [{ scale: value }],
      opacity: value,
    };
  }, [liked, pressed]);

  return (
    <Pressable
      onPress={() => {
        //debounce
        if (!pressed) setPressed(true);
        if (liked.value === 1 || liked.value === 0) {
          if (variant === "like" && liked.value === 0) {
            service.updateLikeStatus({ liked: true, songId });
            liked.value = withSpring(1, undefined, () => setVoted(variant));
          } else if (variant === "dislike" && liked.value === 1) {
            service.updateLikeStatus({ liked: false, songId });
            liked.value = withSpring(0, undefined, () => setVoted(variant));
          } else if (variant === "dislike" && liked.value === 0 && !voted) {
            service.updateLikeStatus({ liked: false, songId });
            liked.value = 1;
            liked.value = withSpring(0, undefined, () => setVoted(variant));
          }
        }
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, outlineStyle]}>
        {variant === "like" ? HeartOutline : HeartDislikeOutline}
      </Animated.View>

      <Animated.View style={fillStyle}>
        {variant === "like" ? Heart : HeartDislike}
      </Animated.View>
    </Pressable>
  );
}

export const LikeButton = memo(LikeButtonComponent);

function LikeBarComponent({ songId, like }: LikeBarProps) {
  const [voted, setVoted] = useState<LikeBarProps["like"]>(like);
  const liked = useSharedValue(likeToInt(like));

  return (
    <View style={styles.likeButton}>
      <View style={styles.likeView}>
        <LikeButton
          songId={songId}
          variant="like"
          liked={liked}
          voted={voted}
          setVoted={setVoted}
        />
        <Text style={styles.likeText}>This rules!</Text>
      </View>
      <View style={styles.likeView}>
        <Text style={styles.likeText}>idk, kinda whack...</Text>
        <LikeButton
          songId={songId}
          variant="dislike"
          liked={liked}
          voted={voted}
          setVoted={setVoted}
        />
      </View>
    </View>
  );
}

export const LikeBar = memo(LikeBarComponent);

const styles = StyleSheet.create({
  likeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 16,
  },
  likeView: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeText: {
    color: "white",
    padding: 5,
  },
});

const HeartOutline = (
  <MaterialCommunityIcons name={"heart-outline"} size={32} color={"white"} />
);
const HeartDislikeOutline = (
  <Ionicons name={"heart-dislike-outline"} size={32} color={"white"} />
);
const Heart = <MaterialCommunityIcons name={"heart"} size={32} color={"red"} />;
const HeartDislike = (
  <Ionicons name={"heart-dislike"} size={32} color={"red"} />
);

function likeToInt(like: LikeBarProps["like"]) {
  return like === "like" ? 1 : 0;
}

function calculateSharedValueBasedOnVariant(
  value: number,
  variant: LikeButtonProps["variant"],
  pressed: boolean,
) {
  if (!pressed) return 0;
  return variant === "dislike" ? 1 - value : value;
}
