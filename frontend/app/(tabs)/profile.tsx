import { useLoadingContext } from "@/components/PageLoader";
import AccountProfile from "@/components/Profile";
import { useWebSocketContext } from "@/components/WebSocketProvider";
import useMostPopularSongs from "@/hooks/use-most-popular-songs";
import useRecentlyLikedSongs from "@/hooks/use-recently-liked-songs";
import { UserProfile, UserService } from "@/service/user";
import { bumpLikeCountIfPresent } from "@/util/likeCountList";
import { LikeCountUpdatePayload } from "@/util/websocket";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuthContext } from "../auth";

export default function Profile() {
  const { apiClient, isAuthenticated, getIdToken } = useAuthContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const { isLoading, setIsLoading } = useLoadingContext();
  const [error, setError] = useState<Error | null>(null);
  const { subscribeLikeCountUpdate } = useWebSocketContext();
  const router = useRouter();
  const { highlightSongId: highlightSongIdParam } = useLocalSearchParams<{
    highlightSongId?: string | string[];
  }>();
  const highlightSongIdRaw = Array.isArray(highlightSongIdParam)
    ? highlightSongIdParam[0]
    : highlightSongIdParam;
  const highlightSongId = highlightSongIdRaw
    ? Number.parseInt(highlightSongIdRaw, 10)
    : undefined;
  const highlightSongIdValid =
    highlightSongId !== undefined && !Number.isNaN(highlightSongId)
      ? highlightSongId
      : undefined;
  const refreshedForHighlightRef = useRef<number | null>(null);

  const service = useMemo(() => new UserService(apiClient), [apiClient]);

  const popular = useMostPopularSongs({ enabled: !!user, service });
  const liked = useRecentlyLikedSongs({ enabled: !!user, service });

  const refreshData = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    if (highlightSongIdValid === undefined) {
      refreshedForHighlightRef.current = null;
      return;
    }
    if (refreshedForHighlightRef.current === highlightSongIdValid) {
      return;
    }
    refreshedForHighlightRef.current = highlightSongIdValid;
    refreshData();
  }, [highlightSongIdValid, refreshData]);

  const clearHighlight = useCallback(() => {
    router.setParams({ highlightSongId: "" });
  }, [router]);

  const onLikeCountUpdate = useCallback(
    (payload: LikeCountUpdatePayload) => {
      popular.applyLikeCountUpdate(payload);
      liked.applyLikeCountUpdate(payload);
      setUser((prev) => {
        if (!prev) {
          return prev;
        }
        const nextSongs = bumpLikeCountIfPresent(prev.songs, payload);
        return nextSongs ? { ...prev, songs: nextSongs } : prev;
      });
    },
    [popular.applyLikeCountUpdate, liked.applyLikeCountUpdate],
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    return subscribeLikeCountUpdate(onLikeCountUpdate);
  }, [isAuthenticated, user, subscribeLikeCountUpdate, onLikeCountUpdate]);

  useEffect(() => {
    async function fetchUser() {
      try {
        console.info("Fetching user profile...");
        setIsLoading(true);
        const result = await service.getUserProfile();
        if (result === null) {
          const idToken = getIdToken();
          if (idToken) {
            const newUser = await service.createNewUser(idToken);
            setUser({ ...newUser, songs: [], tags: [] });
          } else throw new Error("Something went wrong.");
        } else setUser(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (isAuthenticated && user === null && !error) fetchUser();
  }, [user, isAuthenticated, service]);

  return (
    <View style={styles.container}>
      {error && (
        <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
          {error?.message}
        </Text>
      )}
      {!error && isAuthenticated && user && !isLoading && (
        <AccountProfile
          {...user}
          service={service}
          refreshData={refreshData}
          mostPopularSongs={popular.songs}
          mostPopularLoading={popular.isLoading}
          recentlyLikedSongs={liked.songs}
          recentlyLikedLoading={liked.isLoading}
          highlightSongId={highlightSongIdValid}
          onHighlightConsumed={clearHighlight}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 20,
    backgroundColor: "#000",
  },
  horizontal: {
    flexDirection: "column",
    padding: 10,
  },
  gif: { height: 280, width: "auto", marginTop: 200 },
});
