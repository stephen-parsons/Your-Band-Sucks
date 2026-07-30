import { Post } from "@/service/posts";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useState } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { usePostContext } from "../PostProvider";
import { ThemedText } from "../themed-text";

interface LikeBarProps {
  like: Post["like"];
  songId: Post["id"];
}

interface LikeButtonProps {
  songId: Post["id"];
  //like or dislike button
  variant: Post["like"];
  likedSharedValue: SharedValue<number>;
  //whether ot not the user ahs already voted on this song
  voted: LikeBarProps["like"];
  setVoted: (like: LikeBarProps["like"]) => void;
}

function LikeButtonComponent({
  songId,
  variant,
  likedSharedValue,
  voted,
  setVoted,
}: LikeButtonProps) {
  const { service } = usePostContext();
  const [pressed, setPressed] = useState<boolean>(typeof voted !== "undefined");

  const outlineStyle = useAnimatedStyle(() => {
    const value =
      variant === "like" ? likedSharedValue.value : 1 - likedSharedValue.value;
    return {
      transform: [
        {
          scale: interpolate(value, [0, 1], [1, 0], Extrapolation.CLAMP),
        },
      ],
    };
  }, []);

  const fillStyle = useAnimatedStyle(() => {
    const value =
      variant === "like" ? likedSharedValue.value : 1 - likedSharedValue.value;
    return {
      transform: [{ scale: value }],
      opacity: value,
    };
  }, [variant]);

  const voteCallback = (finished?: boolean) => {
    if (finished) {
      runOnJS(() => setVoted(variant));
    }
  };

  return (
    <Pressable
      onPressIn={() => Vibration.vibrate(100)}
      onPress={() => {
        if (!pressed) setPressed(true);
        //debounce, only update status if shared value it fully set
        if (likedSharedValue.value === 1 || likedSharedValue.value === 0) {
          if (variant === "like" && likedSharedValue.value === 0) {
            service.updateLikeStatus({ liked: true, songId });
            likedSharedValue.value = withSpring(1, undefined, voteCallback);
          } else if (variant === "dislike" && likedSharedValue.value === 1) {
            service.updateLikeStatus({ liked: false, songId });
            likedSharedValue.value = withSpring(0, undefined, voteCallback);
          } else if (
            variant === "dislike" &&
            likedSharedValue.value === 0 &&
            !voted
          ) {
            service.updateLikeStatus({ liked: false, songId });
            likedSharedValue.value = 1;
            likedSharedValue.value = withSpring(0, undefined, voteCallback);
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

const LikeButton = memo(LikeButtonComponent);

function LikeBarComponent({ songId, like }: LikeBarProps) {
  const [voted, setVoted] = useState<LikeBarProps["like"]>(like);
  const likedSharedValue = useSharedValue(likeToInt(like));

  return (
    <View style={styles.likeButton}>
      <View style={styles.likeView}>
        <LikeButton
          songId={songId}
          variant="like"
          likedSharedValue={likedSharedValue}
          voted={voted}
          setVoted={setVoted}
        />
        <ThemedText style={styles.likeText}>This rules!</ThemedText>
      </View>
      <View style={styles.likeView}>
        <ThemedText style={styles.likeText}>idk, kinda whack...</ThemedText>
        <LikeButton
          songId={songId}
          variant="dislike"
          likedSharedValue={likedSharedValue}
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
