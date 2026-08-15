import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ACCEPTED_FORMATS_LABEL, MAX_FILE_SIZE_MB } from "./constants";
import { PressableScale } from "./PressableScale";

interface StepPickFileProps {
  picking: boolean;
  onPickFile: () => void;
}

export function StepPickFile({ picking, onPickFile }: StepPickFileProps) {
  const textColor = useThemeColor({}, "text");
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (picking) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 520 }),
          withTiming(1, { duration: 520 }),
        ),
        -1,
        false,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.25, { duration: 700 }),
        ),
        -1,
        false,
      );
      return;
    }
    pulse.value = withTiming(1, { duration: 200 });
    glow.value = withTiming(0, { duration: 200 });
  }, [picking, pulse, glow]);

  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    backgroundColor: interpolateColor(
      glow.value,
      [0, 1],
      ["rgba(29,185,84,0.12)", "rgba(29,185,84,0.35)"],
    ),
  }));

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500).springify()}>
        <ThemedText style={styles.subcopy}>
          Pick an audio file and we&apos;ll walk you through the rest.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(120).duration(500)}
        style={[styles.iconWrap, iconWrapStyle, { borderColor: textColor }]}
      >
        {picking ? (
          <ActivityIndicator size="large" color={textColor} />
        ) : (
          <MaterialCommunityIcons
            name="cloud-upload-outline"
            size={72}
            color={textColor}
          />
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(450)}>
        <PressableScale
          onPress={onPickFile}
          disabled={picking}
          style={[styles.button, picking && styles.buttonDisabled]}
        >
          <Ionicons name="musical-notes" size={20} color={textColor} />
          <ThemedText style={[styles.buttonText, { color: textColor }]}>
            {picking ? "Reading file..." : "Choose audio file"}
          </ThemedText>
        </PressableScale>
      </Animated.View>

      <Animated.View
        entering={FadeIn.delay(260).duration(450)}
        style={styles.metaBox}
      >
        <ThemedText style={styles.metaLabel}>Accepted formats</ThemedText>
        <ThemedText style={styles.metaValue}>
          {ACCEPTED_FORMATS_LABEL}
        </ThemedText>
        <ThemedText style={[styles.metaLabel, styles.metaSpacing]}>
          Max file size
        </ThemedText>
        <ThemedText style={styles.metaValue}>{MAX_FILE_SIZE_MB} MB</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subcopy: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.45)",
  },
  button: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  metaBox: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
  },
  metaValue: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  metaSpacing: {
    marginTop: 12,
  },
});
