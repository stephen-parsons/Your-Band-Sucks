import { useWebSocketContext } from "@/components/WebSocketProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";

const AUTO_DISMISS_MS = 3000;
const SWIPE_UP_THRESHOLD = 40;
const EXIT_DURATION_MS = 500;

export function LikeNotificationBanner() {
  const { notifications, dismissNotification } = useWebSocketContext();
  const insets = useSafeAreaInsets();
  const current = notifications[0];
  const currentIdRef = useRef<string | undefined>(current?.id);
  currentIdRef.current = current?.id;

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isExiting = useSharedValue(false);

  const removeCurrent = useCallback(() => {
    const id = currentIdRef.current;
    isExiting.value = false;
    if (id) {
      dismissNotification(id);
    }
  }, [dismissNotification, isExiting]);

  const animateOutAndDismiss = useCallback(() => {
    if (isExiting.value) {
      return;
    }
    isExiting.value = true;
    opacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
    translateY.value = withTiming(
      -200,
      { duration: EXIT_DURATION_MS },
      (finished) => {
        if (finished) {
          runOnJS(removeCurrent)();
        }
      },
    );
  }, [isExiting, opacity, removeCurrent, translateY]);

  useEffect(() => {
    if (!current) {
      return;
    }
    isExiting.value = false;
    translateY.value = 0;
    opacity.value = 1;
    const timer = setTimeout(animateOutAndDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current?.id, animateOutAndDismiss, isExiting, opacity, translateY]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      if (isExiting.value) {
        return;
      }
      translateY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (isExiting.value) {
        return;
      }
      if (event.translationY >= -SWIPE_UP_THRESHOLD) {
        translateY.value = withSpring(0);
        return;
      }
      runOnJS(animateOutAndDismiss)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!current) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: insets.top + 8 }]}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          key={current.id}
          entering={FadeInUp}
          style={[styles.banner, animatedStyle]}
        >
          <View style={styles.textWrap}>
            <ThemedText style={styles.title}>New like</ThemedText>
            <ThemedText style={styles.message}>{current.message}</ThemedText>
          </View>
          <TouchableOpacity
            onPress={animateOutAndDismiss}
            accessibilityLabel="Dismiss notification"
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" color="#f5f5f5" size={22} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "black",
    borderWidth: 2,
    borderColor: "antiquewhite",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    opacity: 0.95,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
  },
});
