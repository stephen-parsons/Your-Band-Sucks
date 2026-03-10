import { Posts } from "@/service/posts";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type TableProps = {
  title: string;
  data: Posts;
};

type LeaderboardProps = {
  mostLiked: Posts;
  leastLiked: Posts;
};

const getRankDisplay = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return rank.toString();
  }
};

const Table: React.FC<TableProps> = ({ title, data }) => {
  const rows = data.slice(0, 10);

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>{title}</Text>

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
              <Text style={styles.rankCell}>{getRankDisplay(rank)}</Text>
              <Text style={styles.cell}>{item.user.name}</Text>
              <Text style={styles.cell}>{item.title}</Text>
              <Text
                style={[
                  styles.countCell,
                  item.likeCount < 0 ? styles.negative : styles.positive,
                ]}
              >
                {item.likeCount}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
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
});
