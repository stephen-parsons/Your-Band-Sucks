import Autocomplete from "@/components/AutoComplete";
import { usePostContext } from "@/components/PostProvider";
import { Header } from "@/components/ui/Header";
import Tag from "@/components/ui/Tag";
import useTags from "@/hooks/use-tags";
import { uploadToS3 } from "@/service/posts";
import * as DocumentPicker from "expo-document-picker";
import React, { Dispatch, SetStateAction, useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/**
 * Upload component
 */
const S3UploadForm: React.FC = () => {
  const { service } = usePostContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  //list of all tags from the db for auto-completing
  const { tags: tagList } = useTags();

  //TODO: sanitize filename and check file size limit (in bytes)
  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
      });

      if (!result.canceled) {
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
    if (uploading) {
      console.info("Already uploading...");
      return;
    }

    if (!file) {
      Alert.alert("Please select a file");
      return;
    }

    try {
      setUploading(true);

      //Generate s3 object key based on user id and filename
      const { objectKey, url: presignedUrl } = await service.getPresignedUrl({
        filename: file.name,
        contentType: file.mimeType,
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
      const uploadResult = await uploadToS3({
        presignedUrl,
        mimeType: file.mimeType,
        blob,
      });
      if (uploadResult.ok) {
        await service.createNewPost({
          title,
          description,
          key: objectKey,
          tags: [],
        });
      }

      setTitle("");
      setDescription("");
      setTags([]);
      setFile(null);

      console.info("Upload successful!");
      Alert.alert("Upload successful");
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }, [file, service]);

  return (
    <View style={styles.container}>
      <Header text={"Show us what you got"} />
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />
      <Text style={styles.label}>Tags</Text>
      <Autocomplete
        placeholder={"Add tags to share your song!"}
        options={tagList?.map((item) => item.description) || []}
        onSelect={(item) =>
          setTags((curr) => {
            if (!item) return curr;
            if (curr.find((tag) => item === tag)) return curr;
            curr.push(item);
            return [...curr];
          })
        }
      />
      <Tags setTags={setTags} tags={tags} />
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

const Tags = ({
  tags,
  setTags,
}: {
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
}) => {
  return (
    <View style={styles.tagConatiner}>
      {tags.map((tag, idx) => (
        <Tag
          showCloseIcon
          tag={tag}
          idx={idx}
          onPress={() => {
            setTags((curr) => {
              curr.splice(idx, 1);
              return [...curr];
            });
          }}
        />
      ))}
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
    color: "white",
    marginLeft: 10,
    flexShrink: 1,
  },
  button: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  paddedButton: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  tagConatiner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  hashtag: {
    marginTop: 2,
  },
  tag: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#e0e0e0", // Light gray background for the tag
    borderRadius: 15, // Rounded corners
    paddingVertical: 5, // Vertical padding
    paddingHorizontal: 10, // Horizontal padding
    margin: 5, // Spacing around the tag
    alignSelf: "flex-start", // Ensures the view only takes up the necessary width
    alignItems: "center",
  },
  tagText: {
    color: "#333333", // Darker text color
    fontWeight: "600", // Semi-bold font weight
    fontSize: 14, // Font size
  },
  xIcon: {
    marginLeft: 4,
    marginTop: 1,
  },
  autoCompleteContainer: {
    backgroundColor: "white",
    borderRadius: 25,
    height: 32.5,
    padding: 8,
    marginTop: 5,
  },
});
