import { Leaderboard } from "@/components/LeaderBoard";
import { usePostContext } from "@/components/PostProvider";
import { useWebSocketContext } from "@/components/WebSocketProvider";
import { Post, Posts } from "@/service/posts";
import { LeaderboardUpdatePayload } from "@/util/websocket";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "../auth";

const LEADERBOARD_LIMIT = 10;

interface LeaderboardState {
  mostLiked: Posts;
  leastLiked: Posts;
}

function toLeaderboardPost(payload: LeaderboardUpdatePayload): Post {
  return {
    id: payload.songId,
    title: payload.title,
    likeCount: payload.likeCount,
    description: "",
    url: "",
    tags: [],
    user: {
      id: 0,
      email: "",
      name: payload.user.name,
      avatar: payload.user.avatar ?? undefined,
    },
  };
}

function applyLeaderboardUpdate(
  state: LeaderboardState,
  payload: LeaderboardUpdatePayload,
): LeaderboardState {
  const nextPost = toLeaderboardPost(payload);

  const patchList = (list: Posts, ascending: boolean): Posts => {
    const without = list.filter((post) => post.id !== payload.songId);
    const existing = list.find((post) => post.id === payload.songId);
    const merged: Post = existing
      ? { ...existing, likeCount: payload.likeCount, title: payload.title }
      : nextPost;

    const edge = without[without.length - 1];
    const shouldInclude =
      existing !== undefined ||
      without.length < LEADERBOARD_LIMIT ||
      (ascending
        ? payload.likeCount <= (edge?.likeCount ?? Infinity)
        : payload.likeCount >= (edge?.likeCount ?? -Infinity));

    if (!shouldInclude) {
      return without.slice(0, LEADERBOARD_LIMIT);
    }

    return [...without, merged]
      .sort((a, b) =>
        ascending ? a.likeCount - b.likeCount : b.likeCount - a.likeCount,
      )
      .slice(0, LEADERBOARD_LIMIT);
  };

  return {
    mostLiked: patchList(state.mostLiked, false),
    leastLiked: patchList(state.leastLiked, true),
  };
}

export default function LeaderBoardView() {
  const { service } = usePostContext();
  const { isAuthenticated } = useAuthContext();
  const { subscribeLeaderboard } = useWebSocketContext();
  const [boards, setBoards] = useState<LeaderboardState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const onLeaderboardUpdate = useCallback(
    (payload: LeaderboardUpdatePayload) => {
      setBoards((prev) =>
        prev ? applyLeaderboardUpdate(prev, payload) : prev,
      );
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    return subscribeLeaderboard(onLeaderboardUpdate);
  }, [isAuthenticated, subscribeLeaderboard, onLeaderboardUpdate]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        console.info("Fetching leaderboard...");
        setIsLoading(true);
        const [mostLiked, leastLiked] = await Promise.all([
          service.getMostPopularPosts(),
          service.getLeastPopularPosts(),
        ]);
        setBoards({ mostLiked, leastLiked });
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (isAuthenticated && boards === null) {
      fetchPosts();
    }
  }, [boards, isAuthenticated, service]);

  return (
    <SafeAreaView style={styles.container}>
      {error && (
        <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
          {error?.message}
        </Text>
      )}
      {isLoading && (
        <View style={styles.horizontal}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )}
      {!error && boards && (
        <Leaderboard
          mostLiked={boards.mostLiked}
          leastLiked={boards.leastLiked}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 20,
    backgroundColor: "#000",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
