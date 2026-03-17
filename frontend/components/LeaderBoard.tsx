import { Post, Posts } from "@/service/posts";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { AnimatedCount } from "./ui/AnimtedCount";
import { Header } from "./ui/Header";

type TableProps = {
  title: string;
  data: Posts;
};

type LeaderboardProps = {
  mostLiked: Posts;
  leastLiked: Posts;
};

const medal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank.toString();
};

/* ---------------- PODIUM BLOCK ---------------- */

const PodiumBlock = ({
  item,
  rank,
  height,
}: {
  item: Post;
  rank: number;
  height: number;
}) => {
  const translateY = useSharedValue(50);
  const opacity = useSharedValue(0);
  const heightAnimation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0);
    opacity.value = withTiming(1);
    heightAnimation.value = withSpring(height);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    height: heightAnimation.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.podiumBlock, style]}>
      <View style={styles.avatarContainer}>
        {item.user.avatar ? (
          <S3Image source={item.user.avatar} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText style={styles.avatarLetter}>
              {item.user.name[0].toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText
        adjustsFontSizeToFit
        numberOfLines={1}
        style={styles.podiumUser}
      >
        {item.user.name.split(" ")[0]}
      </ThemedText>

      <AnimatedCount value={item.likeCount} />
      <ThemedText style={styles.podiumMedal}>{medal(rank)}</ThemedText>
    </Animated.View>
  );
};

/* ---------------- PODIUM ---------------- */

const Podium = ({ data }: { data: Posts }) => {
  const first = data[0];
  const second = data[1];
  const third = data[2];

  if (!first) return null;

  return (
    <View style={styles.podiumContainer}>
      {second && <PodiumBlock item={second} rank={2} height={90} />}

      <PodiumBlock item={first} rank={1} height={130} />

      {third && <PodiumBlock item={third} rank={3} height={70} />}
    </View>
  );
};

/* ---------------- TABLE ---------------- */
const Table: React.FC<TableProps> = ({ title, data }) => {
  const rows = data.slice(0, 10);

  return (
    <ScrollView style={styles.tableContainer}>
      <ThemedText style={styles.tableTitle}>{title}</ThemedText>

      <Podium data={rows} />

      <View style={styles.table}>
        {/* Header */}
        {/* <View style={[styles.row, styles.headerRow]}>
          <ThemedText style={[styles.rankCell, styles.header]}>#</ThemedText>
          <ThemedText style={[styles.cell, styles.header]}>User</ThemedText>
          <ThemedText style={[styles.cell, styles.header]}>Title</ThemedText>
          <ThemedText style={[styles.countCell, styles.header]}>Count</ThemedText>
        </View> */}

        {/* Rows */}
        {rows.map((item, index) => {
          const rank = index + 1;

          return (
            <View key={index} style={styles.row}>
              <ThemedText style={styles.rankCell}>{medal(rank)}</ThemedText>
              <ThemedText style={styles.cell}>{item.user.name}</ThemedText>
              <ThemedText style={styles.cell}>{item.title}</ThemedText>
              <AnimatedCount value={item.likeCount} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  mostLiked = [],
  leastLiked = [],
}) => {
  return (
    <ScrollView style={styles.container}>
      <Header text="Climb the ladder" />
      <Table title="The most popular songs on the internet!" data={mostLiked} />
      <Table title="The worst songs we've ever heard...." data={leastLiked} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* PODIUM */

  podiumContainer: {
    //prevent podium blocks from overflowing
    minHeight: 155,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },

  podiumBlock: {
    width: 110,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },

  podiumMedal: {
    position: "absolute",
    bottom: -12,
    fontSize: 24,
  },

  podiumUser: {
    // flexShrink: 1,
    // height: 20,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 4,
  },

  /* AVATR*/

  avatarContainer: {
    position: "absolute",
    top: -25,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4f7cff",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLetter: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },

  /* TABLE */

  tableContainer: {
    marginBottom: 32,
  },

  tableTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },

  table: {
    // borderWidth: 1,
    // borderColor: "#ddd",
    borderRadius: 6,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    // borderBottomWidth: 1,
    // borderBottomColor: "#eee",
  },

  headerRow: {
    backgroundColor: "#1DB954",
  },

  header: {
    color: "black",
    fontWeight: "bold",
  },

  rankCell: {
    width: 40,
    padding: 8,
    textAlign: "center",
    fontWeight: "bold",
  },

  cell: {
    flex: 2,
    padding: 8,
    fontSize: 12,
  },

  countCell: {
    width: 60,
    padding: 8,
    textAlign: "right",
    fontSize: 12,
  },
});
