import { ErrorModal } from "@/components/ErrorModal";
import { Leaderboard } from "@/components/LeaderBoard";
import { usePostContext } from "@/components/PostProvider";
import { useWebSocketContext } from "@/components/WebSocketProvider";
import { useErrorRetry } from "@/hooks/use-error-retry";
import { Post, Posts } from "@/service/posts";
import { patchRankedLikeCountList } from "@/util/likeCountList";
import { LikeCountUpdatePayload } from "@/util/websocket";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthContext } from "../auth";

const LEADERBOARD_LIMIT = 10;

interface LeaderboardState {
  mostLiked: Posts;
  leastLiked: Posts;
}

function toLeaderboardPost(payload: LikeCountUpdatePayload): Post {
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

function applyLikeCountUpdate(
  state: LeaderboardState,
  payload: LikeCountUpdatePayload,
): LeaderboardState {
  return {
    mostLiked: patchRankedLikeCountList(state.mostLiked, payload, {
      ascending: false,
      limit: LEADERBOARD_LIMIT,
      toItem: toLeaderboardPost,
    }),
    leastLiked: patchRankedLikeCountList(state.leastLiked, payload, {
      ascending: true,
      limit: LEADERBOARD_LIMIT,
      toItem: toLeaderboardPost,
    }),
  };
}

export default function LeaderBoardView() {
  const { service } = usePostContext();
  const { isAuthenticated } = useAuthContext();
  const { subscribeLikeCountUpdate } = useWebSocketContext();
  const [boards, setBoards] = useState<LeaderboardState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { retryCount, onRetry } = useErrorRetry();

  const onLikeCountUpdate = useCallback((payload: LikeCountUpdatePayload) => {
    setBoards((prev) => (prev ? applyLikeCountUpdate(prev, payload) : prev));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    return subscribeLikeCountUpdate(onLikeCountUpdate);
  }, [isAuthenticated, subscribeLikeCountUpdate, onLikeCountUpdate]);

  const fetchPosts = useCallback(async (): Promise<void> => {
    try {
      console.info("Fetching leaderboard...");
      setIsLoading(true);
      const [mostLiked, leastLiked] = await Promise.all([
        service.getMostPopularPosts(),
        service.getLeastPopularPosts(),
      ]);
      setBoards({ mostLiked, leastLiked });
      setError(null);
      setIsLoading(false);
    } catch (e) {
      setError(e as Error);
      console.error(e);
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (isAuthenticated && boards === null && !error) {
      void fetchPosts();
    }
  }, [boards, isAuthenticated, fetchPosts, error]);

  return (
    <SafeAreaView style={styles.container}>
      <ErrorModal
        visible={error !== null}
        error={error}
        retryCount={retryCount}
        onRetry={() => onRetry(() => setError(null))}
      />
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
