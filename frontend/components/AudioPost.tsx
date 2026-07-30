import { useThemeColor } from "@/hooks/use-theme-color";
import { Post } from "@/service/posts";
import { Link, useIsFocused } from "@react-navigation/native";
import React, { memo, useCallback, useEffect, useState } from "react";
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
import AudioProvider from "../audio/AudioManager";
import AudioVisualizer from "./AudioVisualizer";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { LikeBar } from "./ui/LikeButton";

const { width, height } = Dimensions.get("window");

const HEIGHT_FULLSCREEN_OFFSET = 240;

export const ITEM_HEIGHT = height - HEIGHT_FULLSCREEN_OFFSET;

const THUMB_SIZE = 14; // same as in styles

function withBoundary(val: number, end: number, start: number = 0) {
  return val > end ? end : val < start ? start : val;
}

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [positionText, setPositionText] = useState(0);
  const [durationText, setDurationText] = useState(0);
  const isFocused = useIsFocused();

  const thumbColor = useThemeColor({}, "text");

  /**
   * Audio player progress expressed as a decimal value between 0-1
   *
   * Multiply by 100 to express as a percentage between 1-100
   **/
  const progress = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const thumbPosition = useSharedValue(0 - THUMB_SIZE / 2);

  /**
   * Current player position - should be kept in sync with `progress`.
   */
  const position = useSharedValue(0);

  /**
   * Width of progress container for the current audio track.
   *
   * Important: Subtract all padding and width audio playback markers
   **/
  const progressContainerWidth = width - 164;
  const progressContainerStartPosition = 84;
  const progressContainerEndPosition = progressContainerWidth;

  /**
   * Callback for updating the position of various ui elements related to audio tracking.
   * Resets the song to the beginning if it finishes playing.
   */
  const updateValues = (newPosition: number) => {
    if (typeof newPosition !== "number") return;
    const durationValue = AudioProvider.audioBuffer?.buffer?.duration || 0;
    position.value = newPosition;
    progress.value = newPosition / durationValue;
    //Update thumb position as song progresses
    thumbPosition.value =
      (newPosition / durationValue) * progressContainerWidth - THUMB_SIZE / 2;
    setPositionText(newPosition);

    //Check if at the end of the buffer
    //The final onPositionChangedCallback won't fire within the last interval
    const isNearEnd = durationValue && durationValue - newPosition < 0.1;
    if (isNearEnd) {
      onEndCallback();
    }
  };

  /**
   * Callback that fires when the song is finished.
   */
  const onEndCallback = useCallback(() => {
    AudioProvider.audioContext.state === "running" && AudioProvider.stop();
    AudioProvider.updatePosition(0);
    updateValues(0);
    setPositionText(0);
    setIsPlaying(false);
  }, []);

  /**
   * Callback for seeking to new position in the song.
   * Updates both `AudioProvider` state and ui elements together.
   * Relies on `progress` shared value for seeking.
   */
  const seekToPosition = useCallback(() => {
    const newTime =
      progress.value * (AudioProvider.audioBuffer?.buffer.duration || 0);
    updateValues(newTime);
    AudioProvider.updatePosition(newTime);
    AudioProvider.resume(id, newTime);
    setIsPlaying(true);
  }, []);

  /**
   * Pan gesture for handling seking. On start, pause the player.
   * Get the new seeking position `onUpdate` and update `sharedValues`.
   * Seek to new position by updating the AudioProvider and ui elements on end.
   * Must run on JS thread to handle audio management.
   */
  const panGesture = Gesture.Pan()
    .onStart(() => {
      AudioProvider.pause();
      setIsPlaying(false);
      thumbScale.value = withSpring(1.4);
    })
    .onUpdate((event) => {
      //Calculate the current position of the gesture relative to the progress bar.
      const currPosition = event.absoluteX - progressContainerStartPosition;
      //Update thumb position,
      //Make sure not excede the end of the progress container.
      thumbPosition.value = withBoundary(
        currPosition,
        progressContainerEndPosition,
      );
      //Calculate progress.
      //make sure not to exceeed the end of the song.
      const newProgress = currPosition / progressContainerWidth;
      progress.value = withBoundary(newProgress, 1);
    })
    .onEnd(() => {
      thumbScale.value = withSpring(1);
      //Reset the player when new progress is begining or ending of song
      if (progress.value === 1 || progress.value === 0) {
        onEndCallback();
        return;
      }
      //Seek to new timestamp of song
      seekToPosition();
    })
    .runOnJS(true);

  //Auto pause if screen unfocused
  useEffect(() => {
    if (!isFocused && isPlaying) {
      AudioProvider.pause();
      setIsPlaying(false);
    }
  }, [isFocused, isPlaying]);

  const pause = useCallback(async () => {
    AudioProvider.pause();
    setIsPlaying(false);
  }, []);

  const play = useCallback(async () => {
    //initialize new node if current `playerNode` does not match by id
    if (AudioProvider.playerNode?.id !== id) {
      setIsLoadingAudio(true);
      await AudioProvider.setActivePlayer(id, url, updateValues, onEndCallback);
      AudioProvider.start(id);
      setDurationText(AudioProvider.audioBuffer?.buffer.duration || 0);
      //otherwise just resume the current player
    } else AudioProvider.resume(id);
    setIsPlaying(true);
    setIsLoadingAudio(false);
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying]);

  //Animated thumb
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
    left: thumbPosition.value,
  }));

  const progressBarWidthStyle = useAnimatedStyle(() => ({
    width: progress.value * progressContainerWidth,
  }));

  /**
   * Converts a number in seconds into a string of format `mm:ss`
   * @param seconds integer number
   * @returns `mm:ss` time format string
   */
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
      {!image && (
        <View style={{ flex: 1, padding: 16 }}>
          <AudioVisualizer isPlaying={isPlaying} id={id} />
        </View>
      )}

      <View style={styles.audioContainer}>
        <View>
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            <ThemedText style={styles.playText}>
              {isLoadingAudio ? "Loading..." : isPlaying ? "Pause" : "Play"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <ThemedText style={styles.time}>
            {formatTime(positionText)}
          </ThemedText>

          <GestureDetector gesture={panGesture}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progress, progressBarWidthStyle]} />
              <Animated.View
                style={[
                  { backgroundColor: thumbColor },
                  styles.thumb,
                  thumbStyle,
                ]}
              />
            </View>
          </GestureDetector>

          <ThemedText style={styles.time}>
            {formatTime(durationText)}
          </ThemedText>
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
            <ThemedText>{`#${tag.description}`}</ThemedText>
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
    minHeight: ITEM_HEIGHT,
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
