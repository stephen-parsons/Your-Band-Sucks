import { AudioProvider } from "@/components/AudioManager";
import { AudioPost } from "@/components/AudioPost";
import { setIsAudioActiveAsync } from "expo-audio";
import { useEffect } from "react";

export default function Feed() {
  useEffect(() => {
    async function configureAudio() {
      await setIsAudioActiveAsync(true);
    }

    configureAudio();
  }, []);
  return (
    <AudioProvider>
      <AudioPost
        user="Stephen (Lead developer)"
        link="http://192.168.4.134:5500/Burnout_Stephen_2-19.mp3"
        title="Burnout California (Demo)"
        description="New Run Motor Run song"
        avatar="http://192.168.4.134:5500/stephen.jpg"
        tags={["rock", "punk", "riffs"]}
      />
    </AudioProvider>
  );
}
