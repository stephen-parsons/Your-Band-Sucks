import { Leaderboard } from "@/components/LeaderBoard";
import {
  getLeastPopularPosts,
  getMostPopularPosts,
  Posts,
} from "@/service/posts";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

//TODO: store in redis cache and open ws to update in realtime
export default function LeaderBoardView() {
  const [mostLiked, setMostLiked] = useState<Posts | null>(null);
  const [leastLiked, setLeastLiked] = useState<Posts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        console.info("Fetching leaderboard...");
        setIsLoading(true);
        const result = await getMostPopularPosts();
        setMostLiked(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (mostLiked === null) fetchPosts();
  }, [mostLiked]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        console.info("Fetching leaderboard...");
        setIsLoading(true);
        const result = await getLeastPopularPosts();
        setLeastLiked(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (leastLiked === null) fetchPosts();
  }, [leastLiked]);

  return (
    <View style={styles.container}>
      {error && (
        <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
          {error?.message}
        </Text>
      )}
      {isLoading && (
        <SafeAreaView style={[styles.container, styles.horizontal]}>
          <ActivityIndicator size="large" color="#0000ff" />
        </SafeAreaView>
      )}
      {!error && mostLiked && leastLiked && (
        <Leaderboard mostLiked={mostLiked} leastLiked={leastLiked} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#000",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
