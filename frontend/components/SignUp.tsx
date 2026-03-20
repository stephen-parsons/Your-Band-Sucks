import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { signUp } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Modal,
  Pressable,
  PressableProps,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewProps,
} from "react-native";
import Animated, { BounceInDown } from "react-native-reanimated";
import AnimatedTextInput from "./AnimatedTextInput";
import { useLoadingContext } from "./PageLoader";
import { ThemedText } from "./themed-text";
import { Header } from "./ui/Header";

export default function SignUp() {
  const { toSignIn, toForgotPassword } = useAuthenticator();
  const [isModalVisible, setModalVisible] = useState(true);
  const { setIsLoading } = useLoadingContext();
  const router = useRouter();
  const [error, setError] = useState(false);
  const fields = [
    { name: "email", rules: { required: "We need to know who you are!" } },
    { name: "password", rules: { required: "Make it a good one!" } },
    {
      name: "confirm-password",
      rules: { required: "Make sure you got it right" },
    },
    { name: "username", rules: { required: "Just for fun!" } },
    { name: "name", rules: { required: "Please provide your full name" } },
  ];
  const {
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm({ mode: "onChange" });

  return (
    <Modal visible={isModalVisible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <Animated.View entering={BounceInDown} style={styles.modalContent}>
          <Header text="Nice to meet you!" />

          <View>
            {fields.map(({ name, rules }) => (
              <Controller
                control={control}
                name={name}
                rules={rules}
                render={({ field: { value, onChange } }) => {
                  const passwordProps = {
                    autoCorrect: false, // Recommended to disable autocorrect for passwords
                    textContentType: "password", // Helps with autofill/keychain integration (iOS)
                    autoComplete: "current-password", // Helps with autofill (Android & cross-platform)
                  };
                  return (
                    <AnimatedTextInput
                      error={errors[name]?.message}
                      onChangeText={onChange}
                      key={name}
                      value={value}
                      label={name}
                      {...(name === "password" && (passwordProps as any))}
                    />
                  );
                }}
              ></Controller>
            ))}
          </View>

          <TouchableOpacity
            disabled={!isValid}
            onPress={async () => {
              try {
                const { email, password, username, name } = getValues();
                setIsLoading(true);
                setModalVisible(false);
                const response = await signUp({
                  username,
                  password,
                  options: {
                    autoSignIn: true,
                    userAttributes: { email, name },
                  },
                });
                if (response.isSignUpComplete == true) router.push("/profile");
              } catch (e) {
                setModalVisible(true);
                setIsLoading(false);
              }
            }}
            style={styles.button}
          >
            <ThemedText>Let's go!</ThemedText>
          </TouchableOpacity>

          {error && (
            <ThemedText
              style={{ color: "rgb(208 70 70)", fontStyle: "italic" }}
            >
              Uh oh! Try again.
            </ThemedText>
          )}

          <LinksContainer
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <LinkButton onPress={toSignIn}>
              <ThemedText>Back to sign in</ThemedText>
            </LinkButton>
            <LinkButton onPress={toForgotPassword}>
              <ThemedText>I forgot my Password</ThemedText>
            </LinkButton>
          </LinksContainer>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function LinksContainer({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[style]}>
      {children}
    </View>
  );
}

export function LinkButton(props: PressableProps) {
  return <Pressable {...props} />;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    opacity: 0.92,
    width: "100%",
    borderWidth: 2,
    borderColor: "antiquewhite",
    backgroundColor: "black",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  input: {
    padding: 8,
    marginTop: 5,
    borderRadius: 25,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 12,
  },
});
