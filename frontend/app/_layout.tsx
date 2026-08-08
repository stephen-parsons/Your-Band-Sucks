import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { LikeNotificationBanner } from "@/components/LikeNotificationBanner";
import { PostContextProvider } from "@/components/PostProvider";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    ThemeProvider as AmplifyThemeProvider,
    Authenticator,
    defaultDarkModeOverride,
} from "@aws-amplify/ui-react-native";
import { Amplify } from "aws-amplify";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AWSConfig } from "@/app.config";
import SignIn from "@/components/auth/SignIn";
import SignUp from "@/components/auth/SignUp";
import PageLoader from "@/components/PageLoader";
import Constants from "expo-constants";
import { Appearance } from "react-native";
import AuthProvider from "./auth";

const {
  userPoolId,
  userPoolClientId,
  identityPoolId,
  awsRegion,
  imagesBucket,
} = Constants.expoConfig?.extra as AWSConfig;

if (
  !userPoolId ||
  !userPoolClientId ||
  !identityPoolId ||
  !imagesBucket ||
  !awsRegion
)
  throw new Error("Missing required AWS configs!!");

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      identityPoolId,
    },
  },
  Storage: {
    S3: {
      region: awsRegion,
      buckets: {
        [imagesBucket]: {
          bucketName: imagesBucket,
          region: awsRegion,
        },
      },
    },
  },
});

export const unstable_settings = {
  anchor: "(tabs)",
};

Appearance.setColorScheme("dark");

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView>
        <SafeAreaProvider>
          <PageLoader>
            <AmplifyThemeProvider
              colorMode={colorScheme}
              theme={{ overrides: [defaultDarkModeOverride] }}
            >
              <Authenticator.Provider>
                <Authenticator
                  loginMechanisms={["email", "username"]}
                  signUpAttributes={["email", "name"]}
                  Container={(props) => (
                    <Authenticator.Container
                      {...props}
                      style={{ backgroundColor: "black" }}
                    />
                  )}
                  components={{
                    SignIn: SignIn,
                    SignUp: SignUp,
                  }}
                >
                  <AuthProvider>
                    <WebSocketProvider>
                      <PostContextProvider>
                        <Stack>
                          <Stack.Screen
                            name="(tabs)"
                            options={{ headerShown: false, animation: "fade" }}
                          />
                        </Stack>
                        <LikeNotificationBanner />
                      </PostContextProvider>
                    </WebSocketProvider>
                  </AuthProvider>
                </Authenticator>
              </Authenticator.Provider>
            </AmplifyThemeProvider>
          </PageLoader>
        </SafeAreaProvider>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
