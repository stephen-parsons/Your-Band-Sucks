import { AudioProvider } from "@/components/AudioManager";
import { AudioPost } from "@/components/AudioPost";
import { usePostContext } from "@/components/PostProvider";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import { useEffect } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Feed() {
  const { posts, isLoading, error } = usePostContext();

  useEffect(() => {
    async function configureAudio() {
      await setIsAudioActiveAsync(true);
      //allows playback on expo go
      //may need to remove in production
      await setAudioModeAsync({ playsInSilentMode: true });
    }

    configureAudio();
  }, []);

  return (
    <SafeAreaView
      edges={{ top: "additive", bottom: "off" }}
      style={{ flex: 1 }}
    >
      <AudioProvider>
        {error && (
          <Text style={{ fontSize: 44, color: "white", textAlign: "center" }}>
            {error?.message}
          </Text>
        )}
        {isLoading ? (
          <SafeAreaView style={[styles.container, styles.horizontal]}>
            <ActivityIndicator size="large" color="#0000ff" />
          </SafeAreaView>
        ) : (
          !error &&
          posts && (
            <FlatList
              ListHeaderComponent={() => (
                <Text
                  style={{
                    fontSize: 20,
                    color: "white",
                    textAlign: "center",
                    backgroundColor: "black",
                    padding: 10,
                  }}
                >
                  Your band sucks!
                </Text>
              )}
              stickyHeaderIndices={[0]}
              data={posts}
              keyExtractor={(post) => post.id.toString()}
              renderItem={({ item }) => <AudioPost {...item} />}
            />
          )
        )}
      </AudioProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
});
