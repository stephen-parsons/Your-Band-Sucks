import { useAuthenticator } from "@aws-amplify/ui-react-native";
import { signIn } from "aws-amplify/auth";
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
import AnimatedTextInput from "../AnimatedTextInput";
import { useLoadingContext } from "../PageLoader";
import { ThemedText } from "../themed-text";
import { Header } from "../ui/Header";
import ConfirmSignUp from "./ConfirmSignUp";

export default function SignIn() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toSignUp, toForgotPassword } = useAuthenticator();
  const [isModalVisible, setModalVisible] = useState(true);
  const { setIsLoading } = useLoadingContext();
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);
  const fields = [
    {
      name: "username",
      rules: { required: "We need to know who you are!" },
      label: "username or email",
    },
    { name: "password", rules: { required: "What's the password?" } },
  ];

  const {
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm({ mode: "onChange" });

  if (showConfirmation) {
    //if ther has not previously confirmed thier email
    //they need to do it ehre before they san sign in
    //they may need to revisit this screen after confirming
    return (
      <ConfirmSignUp
        username={getValues().username}
        setShowSignInScreen={() => setModalVisible(true)}
      />
    );
  }

  return (
    <Modal visible={isModalVisible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <Animated.View entering={BounceInDown} style={styles.modalContent}>
          <Header text="Sign in to check out new music!" />

          <View>
            {fields.map(({ name, rules, label }) => (
              <Controller
                control={control}
                rules={rules}
                name={name}
                key={name}
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
                      label={label || name}
                      value={value}
                      isPassword={name === "password"}
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
                const { username, password } = getValues();
                setIsLoading(true);
                setModalVisible(false);
                const response = await signIn({
                  username,
                  password,
                  options: { authFlowType: "USER_SRP_AUTH" },
                });
                if (response.nextStep.signInStep === "CONFIRM_SIGN_UP") {
                  console.log("Confirm sign up");
                  setShowConfirmation(true);
                  setIsLoading(false);
                }
                if (response.isSignedIn == true) router.push("/profile");
              } catch (e: any) {
                console.error(e);
                console.error(e.underlyingError);
                setModalVisible(true);
                setIsLoading(false);
                setError(e);
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
              Uh oh! Try again. {error.message}
            </ThemedText>
          )}

          <LinksContainer
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <LinkButton onPress={toForgotPassword}>
              <ThemedText>Forgot Password?</ThemedText>
            </LinkButton>
            <LinkButton onPress={toSignUp}>
              <ThemedText>Sign Up</ThemedText>
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
  button: {
    marginTop: 10,
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 12,
  },
});
