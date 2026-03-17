import { useThemeColor } from "@/hooks/use-theme-color";
import Fuse from "fuse.js";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useDebounce } from "use-debounce";

const MAX_HEIGHT = 240;

type Props = {
  options: string[];
  placeholder?: string;
  onSelect?: (value: string | null) => void;
  maxResults?: number;
};

export default function Autocomplete({
  options,
  placeholder = "Search...",
  onSelect,
  maxResults = 8,
}: Props) {
  const textInputBackgroundColor = useThemeColor(
    {},
    "textInputBackgroundColor",
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [debouncedQuery] = useDebounce(query, 100);

  const progress = useSharedValue(0);

  const fuse = useMemo(() => {
    return new Fuse(options, {
      threshold: 0.3,
    });
  }, [options]);

  const results = useMemo(() => {
    if (!debouncedQuery) return options.slice(0, maxResults);

    const results = fuse
      .search(debouncedQuery)
      .slice(0, maxResults)
      .map((r) => r.item);
    if (results.length === 0) return ["Add new tag"];
    return results;
  }, [debouncedQuery, fuse]);

  function openDropdown() {
    setQuery("");
    setOpen(true);
    progress.value = withTiming(1, { duration: 180 });
  }

  function closeDropdown() {
    progress.value = withTiming(0, { duration: 150 });
    setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(value: string) {
    setQuery(value);
    closeDropdown();
    onSelect?.(value);
  }

  function handleBlur() {
    closeDropdown();
  }

  const targetHeight = Math.min(results.length * 44, MAX_HEIGHT);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      height: interpolate(
        progress.value,
        [0, 1],
        [0, targetHeight],
        Extrapolation.CLAMP,
      ),
    };
  });

  function highlight(text: string) {
    if (!query) return <Text>{text}</Text>;

    const parts = text.split(new RegExp(`(${query})`, "gi"));

    return (
      <Text>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={i} style={styles.highlight}>
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        placeholder={placeholder}
        placeholderTextColor={"gray"}
        style={[styles.input, { backgroundColor: textInputBackgroundColor }]}
        onFocus={openDropdown}
        onBlur={handleBlur}
        onChangeText={(text) => {
          setQuery(text);
          if (!open) openDropdown();
        }}
      />

      {open && (
        <Animated.View style={[styles.dropdown, animatedStyle]}>
          <FlatList
            data={results}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              return (
                <Pressable
                  style={[
                    styles.item,
                    { backgroundColor: textInputBackgroundColor },
                  ]}
                  onPress={() => {
                    if (item === "Add new tag") return handleSelect(query);
                    handleSelect(results[index]);
                  }}
                >
                  {highlight(item)}
                </Pressable>
              );
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 5,
    position: "relative",
    width: "100%",
  },

  input: {
    backgroundColor: "white",
    padding: 8,
    marginTop: 5,
    borderRadius: 25,
  },

  dropdown: {
    position: "absolute",
    width: "100%",
    top: 32.5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "white",
    overflow: "hidden",
  },

  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  highlight: {
    fontWeight: "700",
  },
});
