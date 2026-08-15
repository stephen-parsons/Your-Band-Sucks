import { ThemedText } from "@/components/themed-text";
import Tag from "@/components/ui/Tag";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { formatFileSize } from "./constants";
import { PressableScale } from "./PressableScale";

interface StepConfirmProps {
  title: string;
  description: string;
  tags: string[];
  fileName: string;
  fileSize?: number;
  uploading: boolean;
  onEditForm: () => void;
  onEditTags: () => void;
  onEditFile: () => void;
  onUpload: () => void;
}

export function StepConfirm({
  title,
  description,
  tags,
  fileName,
  fileSize,
  uploading,
  onEditForm,
  onEditTags,
  onEditFile,
  onUpload,
}: StepConfirmProps) {
  if (uploading) {
    return (
      <Animated.View
        key="uploading"
        entering={FadeIn.duration(360)}
        exiting={FadeOut.duration(240)}
        style={styles.loaderWrap}
      >
        <ActivityIndicator size="large" color="#1DB954" />
        <ThemedText style={styles.loaderText}>
          Uploading your track...
        </ThemedText>
        <ThemedText style={styles.loaderSub}>
          Hang tight — this usually takes a moment.
        </ThemedText>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      key="confirm"
      entering={FadeInDown.duration(420).springify()}
      exiting={FadeOut.duration(240)}
      style={styles.container}
    >
      <ThemedText style={styles.headline}>Looking good?</ThemedText>
      <ThemedText style={styles.subcopy}>
        Double-check the details before we send it up.
      </ThemedText>

      <View style={styles.card}>
        <DetailRow label="Title" value={title} />
        <DetailRow label="Description" value={description} />
        <View style={styles.row}>
          <ThemedText style={styles.label}>Tags</ThemedText>
          <View style={styles.tagRow}>
            {tags.map((tag, idx) => (
              <Tag
                key={`${tag}-${idx}`}
                tag={tag}
                idx={idx}
                showCloseIcon={false}
              />
            ))}
          </View>
        </View>
        <DetailRow label="File" value={fileName} />
        <DetailRow label="Size" value={formatFileSize(fileSize)} />
      </View>

      <View style={styles.editRow}>
        <PressableScale onPress={onEditForm} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Edit form</ThemedText>
        </PressableScale>
        <PressableScale onPress={onEditTags} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Edit tags</ThemedText>
        </PressableScale>
        <PressableScale onPress={onEditFile} style={styles.secondaryButton}>
          <ThemedText style={styles.secondaryButtonText}>Edit file</ThemedText>
        </PressableScale>
      </View>

      <PressableScale onPress={onUpload} style={styles.primaryButton}>
        <ThemedText style={styles.primaryButtonText}>Upload</ThemedText>
      </PressableScale>
    </Animated.View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 16,
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subcopy: {
    textAlign: "center",
    color: "rgba(255,255,255,0.65)",
    marginTop: -8,
  },
  card: {
    width: "100%",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
  },
  value: {
    fontSize: 16,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 40,
  },
  loaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  loaderSub: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
