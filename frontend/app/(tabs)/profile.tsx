import { useLoadingContext } from "@/components/PageLoader";
import AccountProfile from "@/components/Profile";
import { UserProfile, UserService } from "@/service/user";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuthContext } from "../auth";

export default function Profile() {
  const { apiClient, isAuthenticated, getIdToken } = useAuthContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const { isLoading, setIsLoading } = useLoadingContext();
  const [error, setError] = useState<Error | null>(null);

  const service = useMemo(() => new UserService(apiClient), [apiClient]);

  const refreshData = useCallback(() => {
    setUser(null);
  }, []);

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
        //handle error when user can't be founy by cognito ID
        //and redner onboarding modal, not dismissable
        //new user should be created when modal appears
        // and user can upload avatar
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
        <AccountProfile {...user} service={service} refreshData={refreshData} />
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
