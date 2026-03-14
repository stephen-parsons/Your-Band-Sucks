import AccountProfile from "@/components/Profile";
import { getUserProfile, UserProfile } from "@/service/user";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userId } from "../_layout";

export default function LeaderBoardView() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshData = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        console.info("Fetching user profile...");
        setIsLoading(true);
        const result = await getUserProfile(userId);
        setUser(result);
        setIsLoading(false);
      } catch (e) {
        setError(e as Error);
        console.error(e);
        setIsLoading(false);
      }
    }
    if (user === null) fetchUser();
  }, [user]);

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
      {!error && user && <AccountProfile {...user} refreshData={refreshData} />}
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
