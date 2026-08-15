import Autocomplete from "@/components/AutoComplete";
import { ThemedText } from "@/components/themed-text";
import Tag from "@/components/ui/Tag";
import { Dispatch, SetStateAction } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { PressableScale } from "./PressableScale";

interface StepTagsProps {
  tags: string[];
  tagOptions: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  onAddTag: (tag: string) => void;
  onContinue: () => void;
}

export function StepTags({
  tags,
  tagOptions,
  setTags,
  onAddTag,
  onContinue,
}: StepTagsProps) {
  const canContinue = tags.length > 0;

  return (
    <Animated.View
      layout={LinearTransition.springify()}
      style={styles.container}
    >
      <Animated.View entering={FadeInDown.duration(420).springify()}>
        <ThemedText style={styles.headline}>Tag it up</ThemedText>
        <ThemedText style={styles.subcopy}>
          Add at least one tag so people can find your track.
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(80).duration(380).springify()}
        layout={LinearTransition.springify()}
        style={styles.fieldBlock}
      >
        <ThemedText style={styles.label}>Search tags</ThemedText>
        <Autocomplete
          placeholder="Search or add a new tag"
          options={tagOptions}
          onSelect={(item) => {
            if (item) {
              onAddTag(item);
            }
          }}
        />
      </Animated.View>

      {tags.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(320).springify()}
          layout={LinearTransition.springify()}
          style={styles.tagContainer}
        >
          {tags.map((tag, idx) => (
            <Tag
              showCloseIcon
              tag={tag}
              idx={idx}
              key={`${tag}-${idx}`}
              onPress={() => {
                setTags((curr) => curr.filter((_, i) => i !== idx));
              }}
            />
          ))}
        </Animated.View>
      )}

      {canContinue && (
        <Animated.View
          entering={FadeInDown.duration(320).springify()}
          layout={LinearTransition.springify()}
        >
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
  subcopy: {
    textAlign: "center",
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 22,
  },
  fieldBlock: {
    width: "100%",
    zIndex: 10,
  },
  label: {
    fontWeight: "600",
    marginBottom: 6,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
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
