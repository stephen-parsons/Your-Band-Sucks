import { AudioProvider } from "@/components/AudioManager";
import { AudioPost } from "@/components/AudioPost";
import { usePostContext } from "@/components/PostProvider";
import { setIsAudioActiveAsync } from "expo-audio";
import { useEffect } from "react";
import { FlatList } from "react-native";

export default function Feed() {
  const { posts } = usePostContext();

  useEffect(() => {
    async function configureAudio() {
      await setIsAudioActiveAsync(true);
    }

    configureAudio();
  }, []);

  return (
    <AudioProvider>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <AudioPost {...item} />}
      />
    </AudioProvider>
  );
}
