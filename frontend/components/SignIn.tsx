import { useThemeColor } from "@/hooks/use-theme-color";
import { signIn } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { BounceInDown } from "react-native-reanimated";
import { useLoadingContext } from "./PageLoader";
import { ThemedText } from "./themed-text";
import { Header } from "./ui/Header";

export default function SignIn() {
  const [isModalVisible, setModalVisible] = useState(true);
  const { setIsLoading } = useLoadingContext();
  const router = useRouter();
  const [error, setError] = useState(false);
  const fields = [{ name: "email" }, { name: "password" }];
  const {
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm({ mode: "onChange" });

  const textInputBackgroundColor = useThemeColor(
    {},
    "textInputBackgroundColor",
  );

  return (
    <Modal visible={isModalVisible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <Animated.View entering={BounceInDown} style={styles.modalContent}>
          <Header text="Sign in to check out new music!" />

          <View>
            {fields.map(({ name }) => (
              <Controller
                control={control}
                name={name}
                render={({ field: { value, onChange } }) => {
                  const passwordProps = {
                    secureTextEntry: true, // Hides the input characters
                    autoCorrect: false, // Recommended to disable autocorrect for passwords
                    textContentType: "password", // Helps with autofill/keychain integration (iOS)
                    autoComplete: "current-password", // Helps with autofill (Android & cross-platform)
                  };
                  return (
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: textInputBackgroundColor },
                      ]}
                      onChangeText={onChange}
                      key={name}
                      value={value}
                      placeholder={name}
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
                const { email, password } = getValues();
                setIsLoading(true);
                setModalVisible(false);
                const response = await signIn({
                  username: email,
                  password,
                  options: { authFlowType: "USER_SRP_AUTH" },
                });
                if (response.isSignedIn == true) router.push("/profile");
              } catch (e) {
                setModalVisible(true);
                setIsLoading(false);
              }
            }}
            style={styles.button}
          >
            <ThemedText>Log in</ThemedText>
          </TouchableOpacity>

          {error && (
            <ThemedText
              style={{ color: "rgb(208 70 70)", fontStyle: "italic" }}
            >
              Uh oh! Try again.
            </ThemedText>
          )}

          {/* <LinksContainer>
            <LinkButton onPress={toSignUp}>Sign Up</LinkButton>
            <LinkButton onPress={toForgotPassword}>Forgot Password?</LinkButton>
          </LinksContainer> */}
        </Animated.View>
      </View>
    </Modal>
  );
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
