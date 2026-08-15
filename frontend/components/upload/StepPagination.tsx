import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { UploadStep } from "./constants";

interface StepPaginationProps {
  step: UploadStep;
}

function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);
  const opacity = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    width.value = withSpring(active ? 24 : 8, {
      damping: 16,
      stiffness: 220,
    });
    opacity.value = withSpring(active ? 1 : 0.35, {
      damping: 16,
      stiffness: 220,
    });
  }, [active, opacity, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function StepPagination({ step }: StepPaginationProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      <Dot active={step === 1} />
      <Dot active={step === 2} />
      <Dot active={step === 3} />
      <Dot active={step === 4} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1DB954",
  },
});
