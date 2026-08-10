import { ThemedText } from "@/components/themed-text";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface TableTabProps<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onChange: (tab: T) => void;
  /** Use a View with space-evenly instead of a horizontal ScrollView. */
  evenly?: boolean;
}

export function TableTab<T extends string>({
  tabs,
  activeTab,
  onChange,
  evenly = false,
}: TableTabProps<T>) {
  const items = tabs.map((tab) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        onPress={() => onChange(tab)}
        style={[styles.tab, isActive && styles.tabActive]}
      >
        <ThemedText
          style={[styles.tabText, !isActive && styles.tabTextInactive]}
        >
          {tab}
        </ThemedText>
      </TouchableOpacity>
    );
  });

  if (evenly) {
    return <View style={[styles.tabBar, styles.tabBarEven]}>{items}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBar}
    >
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 8,
    alignItems: "center",
  },
  tabBarEven: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#1DB954",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextInactive: {
    color: "#888",
  },
});
