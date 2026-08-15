import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { BounceInDown, FadeIn } from "react-native-reanimated";
import { PressableScale } from "./PressableScale";
import { UploadOutcome } from "./constants";

interface UploadResultModalProps {
  outcome: UploadOutcome;
  errorMessage?: string;
  onCloseSuccess: () => void;
  onRestart: () => void;
  onDismissError: () => void;
}

export function UploadResultModal({
  outcome,
  errorMessage,
  onCloseSuccess,
  onRestart,
  onDismissError,
}: UploadResultModalProps) {
  const visible = outcome === "success" || outcome === "error";
  const isSuccess = outcome === "success";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={isSuccess ? onCloseSuccess : onDismissError}
    >
      <View style={styles.overlay}>
        <Animated.View entering={BounceInDown} style={styles.card}>
          <Animated.View entering={FadeIn.delay(80)} style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={isSuccess ? "check-circle" : "alert-circle"}
              size={56}
              color={isSuccess ? "#1DB954" : "#d04646"}
            />
          </Animated.View>

          <ThemedText style={styles.title}>
            {isSuccess ? "Upload successful!" : "Something went wrong"}
          </ThemedText>
          <ThemedText style={styles.body}>
            {isSuccess
              ? "Your track is live. Head to your profile to see it in Recently uploaded."
              : errorMessage ||
                "Something went wrong while uploading. You can try again from the start."}
          </ThemedText>

          {isSuccess ? (
            <PressableScale
              onPress={onCloseSuccess}
              style={styles.primaryButton}
            >
              <ThemedText style={styles.primaryButtonText}>
                View on Profile
              </ThemedText>
            </PressableScale>
          ) : (
            <View style={styles.errorActions}>
              <PressableScale onPress={onRestart} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>
                  Start over
                </ThemedText>
              </PressableScale>
              <PressableScale
                onPress={onDismissError}
                style={styles.secondaryButton}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Stay here
                </ThemedText>
              </PressableScale>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 8,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "700",
    color: "#000",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  secondaryButtonText: {
    fontWeight: "600",
    color: "#fff",
  },
  errorActions: {
    width: "100%",
    gap: 10,
  },
});
