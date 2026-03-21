import { useThemeColor } from "@/hooks/use-theme-color";
import { Post } from "@/service/posts";
import { Link, useIsFocused } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { memo, useCallback, useEffect } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useAudioManager } from "./AudioManager";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { LikeBar } from "./ui/LikeButton";

const { width, height } = Dimensions.get("window");

const THUMB_SIZE = 14; // same as in styles

const AudioPostComponent: React.FC<Post> = ({
  url,
  title,
  description,
  image,
  tags,
  user: { name, avatar },
  id,
  like,
}) => {
  const { setActivePlayer, activePlayer } = useAudioManager();
  const isFocused = useIsFocused();

  const thumbColor = useThemeColor({}, "text");

  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);

  /**
   * Audio player progress expressed as a decimal value between 0-1
   *
   * Multiply by 100 to express as a percentage between 1-100
   **/
  const progress = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const thumbPosition = useSharedValue(0 - THUMB_SIZE / 2);

  const duration = status?.duration ?? 0;
  const position = status?.currentTime ?? 0;
  const progressBarWidth = player.isLoaded ? (position / duration) * 100 : 0;

  /**
   * Width of progress container for the current audio track.
   *
   * Important: Subtract all padding and width audio playback markers
   **/
  const progressContainerWidth = width - 164;
  const progressContainerStartPosition = 84;
  const progressContainerEndPosition = progressContainerWidth;

  //Gesture for handling seeking
  const panGesture = Gesture.Pan()
    .onStart(() => {
      //store the starting position for relative movement
      player.pause();
      thumbScale.value = withSpring(1.4);
    })
    .onUpdate((event) => {
      //Calculate the current position of the gesture relative to the progress bar.
      const currPosition = event.absoluteX - progressContainerStartPosition;
      //Update thumb position,
      //Make sure not excede the end of the progress container.
      thumbPosition.value =
        currPosition > progressContainerEndPosition
          ? progressContainerEndPosition
          : currPosition < 0
            ? 0
            : currPosition;
      //Calculate progress.
      //make sure not to exceeed the end of the song.
      const newProgress = currPosition / progressContainerWidth;
      progress.value =
        newProgress > 1 ? 1 : currPosition / progressContainerWidth;
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1);
      //Seek to new timestamp of song
      const newTime = progress.value * duration;
      player.seekTo(newTime);
      player.play();
    });
  // .runOnJS(true);

  useEffect(() => {
    if (!player.isLoaded) return;
    //Update thumb position as song progresses
    thumbPosition.value =
      (position / duration) * progressContainerWidth - THUMB_SIZE / 2;
  }, [position, duration, player]);

  //Auto pause if screen unfocused
  useEffect(() => {
    if (!isFocused && player.playing) {
      player.pause();
    }
  }, [isFocused]);

  const handlePlayPause = useCallback(async () => {
    if (player.playing) {
      player.pause();
    } else {
      if (activePlayer?.id !== player.id) {
        await setActivePlayer(player);
      }
      player.play();
    }
  }, [player]);

  //Animated thumb
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
    left: thumbPosition.value,
  }));

  const formatTime = (seconds?: number) => {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <View id={"audio-post-" + id} style={styles.container}>
      <View style={styles.header}>
        {avatar && <S3Image source={avatar} style={styles.avatar} />}
        <ThemedText style={styles.title}>{title}</ThemedText>
      </View>

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <View style={styles.audioContainer}>
        <View>
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            <ThemedText style={styles.playText}>
              {player.isLoaded
                ? player.playing
                  ? "Pause"
                  : "Play"
                : "Loading..."}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <ThemedText style={styles.time}>{formatTime(position)}</ThemedText>

          <GestureDetector gesture={panGesture}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[styles.progress, { width: `${progressBarWidth}%` }]}
              />
              <Animated.View
                style={[
                  { backgroundColor: thumbColor },
                  styles.thumb,
                  thumbStyle,
                ]}
              />
            </View>
          </GestureDetector>

          <ThemedText style={styles.time}>{formatTime(duration)}</ThemedText>
        </View>
      </View>
      <LikeBar songId={id} like={like} />

      <ThemedText style={styles.description}>{description}</ThemedText>
      <ThemedText style={styles.userName}>Posted by: {name}</ThemedText>

      <View style={styles.tagsContainer}>
        {tags.map((tag, index) => (
          <Link
            key={index}
            style={styles.tag}
            onPress={() => console.info("Link clicked")}
            action={{ type: "NONE" }}
          >
            #{tag.description}
          </Link>
        ))}
      </View>
    </View>
  );
};

export const AudioPost = memo(AudioPostComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    minHeight: height,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    marginRight: 10,
  },
  title: {
    fontWeight: "bold",
  },
  image: {
    width: width,
    height: width,
  },
  audioContainer: {
    padding: 16,
  },
  playButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 12,
  },
  playText: {
    fontWeight: "bold",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    color: "#aaa",
    width: 40,
    textAlign: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    marginHorizontal: 8,
    justifyContent: "center",
  },
  progress: {
    height: 6,
    backgroundColor: "#1DB954",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: -4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  description: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userName: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: "#aaaaaa",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tag: {
    color: "#1DA1F2",
    marginRight: 8,
  },
});
