import { autoSignIn, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useRouter } from "expo-router";
import { Dispatch, SetStateAction, useCallback, useState } from "react";
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

export default function ConfirmSignUp({
  username,
  setShowSignInScreen,
}: {
  username: string;
  setShowSignInScreen?: Dispatch<SetStateAction<boolean>>;
}) {
  const [isModalVisible, setModalVisible] = useState(true);
  const { setIsLoading } = useLoadingContext();
  const router = useRouter();
  const [error, setError] = useState(false);
  const fields = [
    {
      name: "username",
      rules: { required: "We need to know who you are!" },
      defaultValue: username,
    },
    { name: "code", rules: { required: "Check your email for the code" } },
  ];
  const {
    control,
    formState: { errors, isValid },
    getValues,
  } = useForm({ mode: "onChange" });

  const handleConfirmSignUp = useCallback(
    async (username: string, confirmationCode: string) => {
      try {
        setIsLoading(true);
        setModalVisible(false);
        // Call the confirmSignUp API with the username and confirmation code
        const result = await confirmSignUp({ username, confirmationCode });

        // Check the next step in the result
        if (result.isSignUpComplete) {
          console.log("Sign up complete, signing user in.");
          try {
            await autoSignIn();
            router.push("/profile");
          } catch (e: any) {
            //if not able to auto-sign in, render sign in screen
            console.error(e);
            setModalVisible(false);
            setShowSignInScreen?.(true);
          }
        }
      } catch (error: any) {
        setModalVisible(true);
        setIsLoading(false);
        setError(error.message);
        console.error("Error confirming sign up:", error);
        // Handle specific errors, e.g., incorrect code, user not found, etc.
      }
    },
    [],
  );

  return (
    <Modal visible={isModalVisible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <Animated.View entering={BounceInDown} style={styles.modalContent}>
          <Header text="Let's make we got it right" />

          <View>
            {fields.map(({ name, rules, defaultValue }) => (
              <Controller
                control={control}
                rules={rules}
                name={name}
                key={name}
                defaultValue={defaultValue}
                render={({ field: { value, onChange } }) => {
                  return (
                    <AnimatedTextInput
                      error={errors[name]?.message?.toString()}
                      onChangeText={onChange}
                      key={name}
                      label={name}
                      value={value}
                      //disable the username field
                      editable={name !== "username"}
                    />
                  );
                }}
              ></Controller>
            ))}
          </View>

          <TouchableOpacity
            disabled={!isValid}
            onPress={async () => {
              const { code } = getValues();
              await handleConfirmSignUp(username, code);
            }}
            style={styles.button}
          >
            <ThemedText>I'm ready to party!</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isValid}
            onPress={async () => {
              await resendSignUpCode({ username });
            }}
            style={styles.link}
          >
            <ThemedText>Resend code</ThemedText>
          </TouchableOpacity>

          {error && (
            <ThemedText
              style={{ color: "rgb(208 70 70)", fontStyle: "italic" }}
            >
              Uh oh! Try again.
            </ThemedText>
          )}
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
  link: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 12,
  },
});
