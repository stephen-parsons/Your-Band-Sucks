/* ---------------- COUNT ANIMATION ---------------- */

import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const AnimatedCount = ({ value }: { value: number }) => {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, { duration: 600 });
  }, [value]);

  const [display, setDisplay] = useState(0);

  useDerivedValue(() => {
    runOnJS(setDisplay)(Math.round(animated.value));
  });

  return (
    <Text style={[styles.count, value < 0 ? styles.negative : styles.positive]}>
      {display}
    </Text>
  );
};
const styles = StyleSheet.create({
  positive: {
    color: "green",
  },

  negative: {
    color: "red",
  },

  count: {
    width: 60,
    textAlign: "center",
    padding: 6,
    fontWeight: "bold",
  },
});
