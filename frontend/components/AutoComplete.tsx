import { useThemeColor } from "@/hooks/use-theme-color";
import Fuse from "fuse.js";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useDebounce } from "use-debounce";

const MAX_HEIGHT = 280;
const ROW_HEIGHT = 44;

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
    if (!debouncedQuery) {
      return options.slice(0, maxResults);
    }

    const matched = fuse
      .search(debouncedQuery)
      .slice(0, maxResults)
      .map((r) => r.item);
    if (matched.length === 0) {
      return ["Add new tag"];
    }
    return matched;
  }, [debouncedQuery, fuse, maxResults, options]);

  function openDropdown() {
    setOpen(true);
    progress.value = withTiming(1, { duration: 180 });
  }

  function closeDropdown() {
    progress.value = withTiming(0, { duration: 150 });
    setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(value: string) {
    setQuery("");
    closeDropdown();
    onSelect?.(value);
  }

  function handleBlur() {
    closeDropdown();
  }

  const targetHeight = Math.min(results.length * ROW_HEIGHT, MAX_HEIGHT);

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
    if (!query) {
      return <Text style={styles.itemText}>{text}</Text>;
    }

    const parts = text.split(new RegExp(`(${query})`, "gi"));

    return (
      <Text style={styles.itemText}>
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
        autoCapitalize="none"
        value={query}
        placeholder={placeholder}
        placeholderTextColor={"gray"}
        style={[styles.input, { backgroundColor: textInputBackgroundColor }]}
        onFocus={openDropdown}
        onBlur={handleBlur}
        onChangeText={(text) => {
          setQuery(text);
          if (!open) {
            openDropdown();
          }
        }}
      />

      {open && (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.duration(180)}
          style={[styles.dropdown, animatedStyle]}
        >
          <View style={styles.dropdownShadeTop} pointerEvents="none" />
          <FlatList
            data={results}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.list}
            renderItem={({ item, index }) => {
              const isAddNew = item === "Add new tag";
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.item,
                    index % 2 === 1 && styles.itemAlt,
                    pressed && styles.itemPressed,
                  ]}
                  onPress={() => {
                    if (isAddNew) {
                      handleSelect(query.trim());
                      return;
                    }
                    handleSelect(results[index]);
                  }}
                >
                  {isAddNew ? (
                    <Text style={styles.addNewText}>
                      {`Add "${query.trim()}"`}
                    </Text>
                  ) : (
                    highlight(item)
                  )}
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
    zIndex: 20,
    position: "relative",
    width: "100%",
  },

  input: {
    backgroundColor: "white",
    padding: 12,
    marginTop: 5,
    borderRadius: 25,
  },

  dropdown: {
    // In-flow so a long results list pushes Continue down instead of covering it.
    width: "100%",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.35)",
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#1DB954",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: "#1DB954",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
    }),
  },

  list: {
    flexGrow: 0,
  },

  dropdownShadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: ROW_HEIGHT,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  itemAlt: {
    backgroundColor: "rgba(29,185,84,0.08)",
  },

  itemPressed: {
    backgroundColor: "rgba(29,185,84,0.22)",
  },

  itemText: {
    color: "#f2f2f2",
    fontSize: 15,
  },

  addNewText: {
    color: "#1DB954",
    fontWeight: "700",
    fontSize: 15,
  },

  highlight: {
    fontWeight: "700",
    color: "#1DB954",
  },
});
