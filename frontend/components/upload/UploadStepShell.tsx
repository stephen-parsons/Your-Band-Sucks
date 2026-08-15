import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { UploadStep } from "./constants";

interface UploadStepShellProps {
  step: UploadStep;
  children: ReactNode;
}

export function UploadStepShell({ step, children }: UploadStepShellProps) {
  return (
    <View style={styles.outer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={step}
          entering={FadeIn.duration(420)}
          exiting={FadeOut.duration(280)}
          style={styles.inner}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  inner: {
    width: "100%",
    maxWidth: 520,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
});
