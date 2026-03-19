import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { PostContextProvider } from "@/components/PostProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ThemeProvider as AmplifyThemeProvider,
  Authenticator,
  defaultDarkModeOverride,
} from "@aws-amplify/ui-react-native";
import { Amplify } from "aws-amplify";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import PageLoader from "@/components/PageLoader";
import SignIn from "@/components/SignIn";
import SignUp from "@/components/SignUp";
import Constants from "expo-constants";
import AuthProvider from "./auth";

const {
  userPoolId,
  userPoolClientId,
  identityPoolId,
  awsRegion,
  imagesBucket,
} = Constants.expoConfig?.extra || {};

if (!userPoolId || !userPoolClientId || !identityPoolId)
  throw new Error("Missing required Cognito configs!!");

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
      bucket: imagesBucket,
      region: awsRegion,
      buckets: {
        [imagesBucket]: {
          bucketName: imagesBucket,
          region: awsRegion,
          paths: {
            "*": {
              authenticated: ["get"],
              guest: ["get"],
            },
          },
        },
      },
    },
  },
});

export const unstable_settings = {
  anchor: "(tabs)",
};

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
                  components={{ SignIn: SignIn, SignUp: SignUp }}
                >
                  <AuthProvider>
                    <PostContextProvider>
                      <Stack>
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="modal"
                          options={{ presentation: "modal", title: "Modal" }}
                        />
                      </Stack>
                    </PostContextProvider>
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
