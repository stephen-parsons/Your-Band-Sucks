import { ThemedText } from "@/components/themed-text";
import { PressableScale } from "@/components/upload/PressableScale";
import { MAX_ERROR_RETRIES } from "@/hooks/use-error-retry";
import { HttpError } from "@/util/httpError";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { BounceInDown, FadeIn } from "react-native-reanimated";

interface ErrorModalProps {
  visible: boolean;
  error: Error | null;
  retryCount: number;
  onRetry: () => void;
}

export function ErrorModal({
  visible,
  error,
  retryCount,
  onRetry,
}: ErrorModalProps) {
  const canDismiss = retryCount < MAX_ERROR_RETRIES;
  const statusCode = error instanceof HttpError ? error.status : undefined;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={canDismiss ? onRetry : () => undefined}
    >
      <View style={styles.overlay}>
        <Animated.View entering={BounceInDown} style={styles.card}>
          <Animated.View entering={FadeIn.delay(80)} style={styles.iconWrap}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={56}
              color="#d04646"
            />
          </Animated.View>

          <ThemedText style={styles.title}>Something went wrong</ThemedText>
          {statusCode !== undefined && (
            <ThemedText style={styles.status}>Status {statusCode}</ThemedText>
          )}
          <ThemedText style={styles.body}>
            {canDismiss
              ? "We couldn't load this page. Close to try again. If this keeps happening, close the app and reopen it."
              : "We couldn't load this page. Close the app and reopen it."}
          </ThemedText>
          {__DEV__ && error?.message ? (
            <ThemedText style={styles.devMessage}>{error.message}</ThemedText>
          ) : null}

          {canDismiss ? (
            <PressableScale onPress={onRetry} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>Close</ThemedText>
            </PressableScale>
          ) : null}
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
    textAlign: "center",
  },
  status: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 8,
  },
  devMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
});
