import { Post, Posts } from "@/service/posts";
import React, { useEffect } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

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
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {item.user.name[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.podiumUser}>
        {item.user.name.split(" ")[0]}
      </Text>

      <AnimatedCount value={item.likeCount} />
      <Text style={styles.podiumMedal}>{medal(rank)}</Text>
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

/* ---------------- COUNT ANIMATION ---------------- */

const AnimatedCount = ({ value }: { value: number }) => {
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, { duration: 600 });
  }, [value]);

  const [display, setDisplay] = React.useState(0);

  useDerivedValue(() => {
    runOnJS(setDisplay)(Math.round(animated.value));
  });

  return (
    <Text style={[styles.count, value < 0 ? styles.negative : styles.positive]}>
      {display}
    </Text>
  );
};

/* ---------------- TABLE ---------------- */

const Table: React.FC<TableProps> = ({ title, data }) => {
  const rows = data.slice(0, 10);

  return (
    <ScrollView style={styles.tableContainer}>
      <Text style={styles.tableTitle}>{title}</Text>

      <Podium data={rows} />

      <View style={styles.table}>
        {/* Header */}
        {/* <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.rankCell, styles.header]}>#</Text>
          <Text style={[styles.cell, styles.header]}>User</Text>
          <Text style={[styles.cell, styles.header]}>Title</Text>
          <Text style={[styles.countCell, styles.header]}>Count</Text>
        </View> */}

        {/* Rows */}
        {rows.map((item, index) => {
          const rank = index + 1;

          return (
            <View key={index} style={styles.row}>
              <Text style={styles.rankCell}>{medal(rank)}</Text>
              <Text style={styles.cell}>{item.user.name}</Text>
              <Text style={styles.cell}>{item.title}</Text>
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
      <Table title="The most popular songs on the internet!" data={mostLiked} />
      <Table title="The worst songs we've ever heard...." data={leastLiked} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    backgroundColor: "#f5f5f5",
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
    color: "white",
    fontSize: 20,
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
    color: "white",
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
