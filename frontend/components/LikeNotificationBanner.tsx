import { useWebSocketContext } from "@/components/WebSocketProvider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";

export function LikeNotificationBanner() {
  const { notifications, dismissNotification } = useWebSocketContext();
  const insets = useSafeAreaInsets();
  const current = notifications[0];

  if (!current) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: insets.top + 8 }]}
    >
      <Animated.View
        key={current.id}
        entering={FadeInUp}
        exiting={FadeOutUp}
        style={styles.banner}
      >
        <View style={styles.textWrap}>
          <ThemedText style={styles.title}>New like</ThemedText>
          <ThemedText style={styles.message}>{current.message}</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => dismissNotification(current.id)}
          accessibilityLabel="Dismiss notification"
          hitSlop={12}
        >
          <MaterialCommunityIcons name="close" color="#f5f5f5" size={22} />
        </TouchableOpacity>
      </Animated.View>
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
