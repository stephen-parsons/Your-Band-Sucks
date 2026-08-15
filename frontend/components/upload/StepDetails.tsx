import { ThemedText } from "@/components/themed-text";
import { useMemo } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { PressableScale } from "./PressableScale";

interface StepDetailsProps {
  fileName: string;
  title: string;
  description: string;
  textInputBackgroundColor: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContinue: () => void;
}

export function StepDetails({
  fileName,
  title,
  description,
  textInputBackgroundColor,
  onTitleChange,
  onDescriptionChange,
  onContinue,
}: StepDetailsProps) {
  const showDescription = title.trim().length > 0;
  const canContinue = title.trim().length > 0 && description.trim().length > 0;

  const visibleFieldCount = 1 + (showDescription ? 1 : 0);

  const inputSize = useMemo(() => {
    if (visibleFieldCount === 1) {
      return { fontSize: 28, paddingVertical: 18, paddingHorizontal: 18 };
    }
    return { fontSize: 20, paddingVertical: 14, paddingHorizontal: 14 };
  }, [visibleFieldCount]);

  return (
    <Animated.View
      layout={LinearTransition.springify()}
      style={styles.container}
    >
      <Animated.View entering={FadeInDown.duration(420).springify()}>
        <ThemedText style={styles.headline}>Tell us about it</ThemedText>
        <View style={styles.fileChip}>
          <ThemedText style={styles.fileChipText} numberOfLines={1}>
            {fileName}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View
        layout={LinearTransition.springify()}
        style={styles.fieldBlock}
      >
        <ThemedText style={styles.label}>Title</ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: textInputBackgroundColor,
              fontSize: inputSize.fontSize,
              paddingVertical: inputSize.paddingVertical,
              paddingHorizontal: inputSize.paddingHorizontal,
            },
          ]}
          value={title}
          placeholder="What's your song called?"
          placeholderTextColor="rgba(0,0,0,0.35)"
          onChangeText={onTitleChange}
        />
      </Animated.View>

      {showDescription && (
        <Animated.View
          entering={FadeInDown.duration(380).springify()}
          layout={LinearTransition.springify()}
          style={styles.fieldBlock}
        >
          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              {
                backgroundColor: textInputBackgroundColor,
                fontSize: inputSize.fontSize,
                paddingVertical: inputSize.paddingVertical,
                paddingHorizontal: inputSize.paddingHorizontal,
              },
            ]}
            value={description}
            placeholder="Tell us about your new tune"
            placeholderTextColor="rgba(0,0,0,0.35)"
            multiline
            onChangeText={onDescriptionChange}
          />
        </Animated.View>
      )}

      {canContinue && (
        <Animated.View entering={FadeInDown.duration(320).springify()}>
          <PressableScale onPress={onContinue} style={styles.button}>
            <ThemedText style={styles.buttonText}>Continue</ThemedText>
          </PressableScale>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 16,
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  fileChip: {
    alignSelf: "center",
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(29,185,84,0.15)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.4)",
  },
  fileChipText: {
    color: "#1DB954",
    fontWeight: "600",
    fontSize: 13,
  },
  fieldBlock: {
    width: "100%",
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 18,
    color: "#111",
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
