import { createNewPost, getPresignedUrl, uploadToS3 } from "@/service/posts";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const userId = 2;

/**
 * Upload component
 */
const S3UploadForm: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  //TODO: mkae this an array
  //fetch existing tags at startup and cache in trie for fast lookup
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  //TODO: sanitize filename and check file size limit (in bytes)
  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
      });

      if (!result.canceled) {
        // Process the selected document(s)
        console.log(result.assets[0]);
        setFile(result.assets[0]);
      } else {
        console.log("Document selection cancelled");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error picking file");
    }
  }, []);

  const uploadFile = useCallback(async () => {
    if (!file) {
      Alert.alert("Please select a file");
      return;
    }

    try {
      setUploading(true);

      //Generate s3 object key based on user id and filename
      const presignedUrl = await getPresignedUrl({
        userId,
        filename: file.name,
      });

      let blob;

      if (Platform.OS === "web") {
        blob = file.file;
      } else {
        const response = await fetch(file.uri);
        blob = (await response.blob()) as Blob;
      }

      if (!blob) throw new Error("Error getting blob to upload");

      //Uploads file to s3 using pres-signed url
      await uploadToS3({ presignedUrl, mimeType: file.mimeType, blob });
      await createNewPost({
        userId,
        title,
        description,
        url: `${userId}/${file.name}`,
        tags: [],
      });

      Alert.alert("Upload successful");
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Tags (comma separated)</Text>
      <TextInput style={styles.input} value={tags} onChangeText={setTags} />

      <View style={styles.fileRow}>
        <Pressable
          onPress={pickFile}
          style={[styles.button, styles.paddedButton]}
        >
          <Text style={styles.buttonText}>Select File</Text>
        </Pressable>
        <Text style={styles.fileName}>
          {file ? file.name : "No file selected"}
        </Text>
      </View>

      <Pressable
        onPress={uploadFile}
        disabled={uploading}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {uploading ? "Uploading..." : "Upload"}
        </Text>
      </Pressable>
    </View>
  );
};

export default S3UploadForm;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#000",
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    marginTop: 10,
  },
  input: {
    backgroundColor: "white",
    padding: 8,
    marginTop: 5,
    borderRadius: 25,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  fileName: {
    marginLeft: 10,
    flexShrink: 1,
  },
  button: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  paddedButton: {
    paddingLeft: 20,
    paddingRight: 20,
  },
});
