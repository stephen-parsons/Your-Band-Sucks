import { usePostContext } from "@/components/PostProvider";
import { Header } from "@/components/ui/Header";
import {
  isAcceptedAudioFile,
  MAX_FILE_SIZE_BYTES,
  MaxFileSizeError,
  UnsupportedAudioFormatError,
  UploadOutcome,
  UploadStep,
} from "@/components/upload/constants";
import { StepConfirm } from "@/components/upload/StepConfirm";
import { StepDetails } from "@/components/upload/StepDetails";
import { StepPagination } from "@/components/upload/StepPagination";
import { StepPickFile } from "@/components/upload/StepPickFile";
import { StepTags } from "@/components/upload/StepTags";
import { UploadResultModal } from "@/components/upload/UploadResultModal";
import { UploadStepShell } from "@/components/upload/UploadStepShell";
import useTags from "@/hooks/use-tags";
import { useThemeColor } from "@/hooks/use-theme-color";
import { uploadToS3 } from "@/service/posts";
import { assertSafeFilename, UnsafeFilenameError } from "@/util/filename";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCEPTED_PICKER_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  "audio/ogg",
  "audio/*",
] as const;

/**
 * Multi-step song upload flow.
 */
const S3UploadForm: React.FC = () => {
  const textInputBackgroundColor = useThemeColor(
    {},
    "textInputBackgroundColor",
  );
  const { service } = usePostContext();
  const router = useRouter();
  const { tags: tagList } = useTags();

  const [step, setStep] = useState<UploadStep>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outcome, setOutcome] = useState<UploadOutcome>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [createdPostId, setCreatedPostId] = useState<number | null>(null);

  const goTo = useCallback((next: UploadStep) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(next);
  }, []);

  const resetFlow = useCallback(() => {
    setStep(1);
    setTitle("");
    setDescription("");
    setTags([]);
    setFile(null);
    setPicking(false);
    setUploading(false);
    setOutcome("idle");
    setErrorMessage(undefined);
    setCreatedPostId(null);
  }, []);

  const pickFile = useCallback(async () => {
    try {
      setPicking(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: [...ACCEPTED_PICKER_TYPES],
      });

      if (result.canceled) {
        return;
      }

      const selected = result.assets?.[0];
      if (!selected) {
        return;
      }

      if ((selected.size ?? 0) > MAX_FILE_SIZE_BYTES) {
        throw new MaxFileSizeError();
      }

      if (
        !isAcceptedAudioFile({
          filename: selected.name,
          mimeType: selected.mimeType,
        })
      ) {
        throw new UnsupportedAudioFormatError();
      }

      assertSafeFilename(selected.name);

      setFile(selected);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goTo(2);
    } catch (err) {
      console.error(err);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (
        err instanceof MaxFileSizeError ||
        err instanceof UnsafeFilenameError ||
        err instanceof UnsupportedAudioFormatError
      ) {
        setErrorMessage(err.message);
        setOutcome("error");
      } else {
        setErrorMessage("Error picking file");
        setOutcome("error");
      }
    } finally {
      setPicking(false);
    }
  }, [goTo]);

  const uploadFile = useCallback(async () => {
    if (uploading) {
      return;
    }

    if (!file || !title.trim() || !description.trim() || tags.length <= 0) {
      setErrorMessage("Please complete all fields before uploading.");
      setOutcome("error");
      return;
    }

    if ((file.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(new MaxFileSizeError().message);
      setOutcome("error");
      return;
    }

    try {
      setUploading(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      assertSafeFilename(file.name);

      const { objectKey, url: presignedUrl } = await service.getPresignedUrl({
        filename: file.name,
        contentType: file.mimeType,
      });

      let blob: Blob | undefined;
      if (Platform.OS === "web") {
        blob = file.file ?? undefined;
      } else {
        const response = await fetch(file.uri);
        blob = await response.blob();
      }

      if (!blob) {
        throw new Error("Error getting blob to upload");
      }

      const uploadResult = await uploadToS3({
        presignedUrl,
        mimeType: file.mimeType,
        blob,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const created = await service.createNewPost({
        title: title.trim(),
        description: description.trim(),
        key: objectKey,
        tags,
      });

      setCreatedPostId(created.id);
      setOutcome("success");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (
        err instanceof MaxFileSizeError ||
        err instanceof UnsafeFilenameError
      ) {
        setErrorMessage(err.message);
      } else if (err instanceof Error && err.message) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Upload failed");
      }
      setOutcome("error");
    } finally {
      setUploading(false);
    }
  }, [file, service, title, description, tags, uploading]);

  const onCloseSuccess = useCallback(() => {
    const songId = createdPostId;
    resetFlow();
    if (songId != null) {
      router.push({
        pathname: "/profile",
        params: { highlightSongId: String(songId) },
      });
    } else {
      router.push("/profile");
    }
  }, [createdPostId, resetFlow, router]);

  const onRestart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetFlow();
  }, [resetFlow]);

  const onDismissError = useCallback(() => {
    setOutcome("idle");
    setErrorMessage(undefined);
  }, []);

  const addTag = useCallback((item: string) => {
    setTags((curr) => {
      if (curr.includes(item)) {
        return curr;
      }
      return [...curr, item];
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header text={"Show us what you got"} />
      <UploadStepShell step={step}>
        {step === 1 && <StepPickFile picking={picking} onPickFile={pickFile} />}
        {step === 2 && file && (
          <StepDetails
            fileName={file.name}
            title={title}
            description={description}
            textInputBackgroundColor={textInputBackgroundColor}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onContinue={() => goTo(3)}
          />
        )}
        {step === 3 && (
          <StepTags
            tags={tags}
            tagOptions={tagList?.map((item) => item.description) || []}
            setTags={setTags}
            onAddTag={addTag}
            onContinue={() => goTo(4)}
          />
        )}
        {step === 4 && file && (
          <StepConfirm
            title={title}
            description={description}
            tags={tags}
            fileName={file.name}
            fileSize={file.size}
            uploading={uploading}
            onEditForm={() => goTo(2)}
            onEditTags={() => goTo(3)}
            onEditFile={() => goTo(1)}
            onUpload={uploadFile}
          />
        )}
      </UploadStepShell>
      <StepPagination step={step} />
      <UploadResultModal
        outcome={outcome}
        errorMessage={errorMessage}
        onCloseSuccess={onCloseSuccess}
        onRestart={onRestart}
        onDismissError={onDismissError}
      />
    </SafeAreaView>
  );
};

export default S3UploadForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000",
  },
});
