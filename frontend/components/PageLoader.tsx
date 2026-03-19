import { BlurView } from "expo-blur";
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export interface ILoadingContext {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const LoadingContext = createContext<ILoadingContext>({
  isLoading: false,
  setIsLoading: () => {},
});

export default function PageLoader({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && (
        <BlurView style={[styles.container]} intensity={isLoading ? 50 : 0}>
          <Animated.Image
            entering={FadeIn.duration(500)}
            style={styles.gif}
            source={require("../assets/images/beavis_butthead.gif")}
          />
        </BlurView>
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoadingContext = (): ILoadingContext => {
  const context = useContext(LoadingContext);

  return context;
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#000",
    position: "absolute",
    width: "100%",
    zIndex: 100,
    opacity: 95,
    height: "100%",
    justifyContent: "center",
    flexDirection: "column",
  },
  gif: { height: 280, width: "auto" },
});
