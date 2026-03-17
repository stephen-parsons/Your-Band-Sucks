import { AnimatedCount } from "@/components/ui/AnimtedCount";
import { uploadToS3, UserProfile, UserService } from "@/service/user";
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { ReactNode, useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { Header } from "./ui/Header";
import Tag from "./ui/Tag";

const AccountProfile = ({
  name: username,
  avatar: avatarKey,
  email,
  songs: posts,
  tags,
  refreshData,
  service,
}: UserProfile & { service: UserService; refreshData: () => void }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImageFile = useCallback(async () => {
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

      const filename = file.fileName || "avatar";

      //Generate s3 object key based on user id and filename
      const { url: presignedUrl, objectKey } = await service.getPresignedUrl({
        filename,
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
        await service.createNewAvatar({
          key: objectKey,
        });
      }

      setFile(null);
      refreshData();

      console.info("Upload successful!");
      Alert.alert("Upload successful");
    } catch (err) {
      console.error(err);
      Alert.alert("Upload failed");
    } finally {
      setUploading(false);
      setModalVisible(false);
    }
  }, [file]);

  //TODO: sanitize filename and check file size limit (in bytes)
  const pickFile = useCallback(async () => {
    // No permission request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images", // Restrict to images only
      allowsEditing: true, // Allows user to crop the image
      aspect: [4, 3], // Optional: aspect ratio for editing
      quality: 1, // Optional: image quality (0 to 1)
    });

    if (!result.canceled) {
      if (result.assets[0].type !== "image")
        throw new Error("Only images allowed!");
      // Access the image URI from result.assets[0].ur
      console.info("Picked image file: " + result.assets[0].fileName);
      setFile(result.assets[0]);
    }
  }, []);

  function ListItem({
    item,
    count,
    index,
  }: {
    index: number;
    count: number;
    item: ReactNode;
  }) {
    return (
      <View key={index} style={styles.row}>
        {item}
        <AnimatedCount value={count || 0} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header text={"Looking good!"} signOut />
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.duration(800).springify()}
        style={styles.header}
      >
        <View style={styles.avatarColumn}>
          {avatarKey ? (
            <View style={styles.imageContainer}>
              <S3Image source={avatarKey} style={styles.avatar} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
              >
                <FontAwesome
                  style={styles.editIcon}
                  name="pencil-square-o"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.placeholder}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Animated.View entering={ZoomIn.delay(400)}>
                <MaterialCommunityIcons name="plus" color="#999" size={28} />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          entering={FadeInRight.delay(300).duration(600)}
          style={styles.infoColumn}
        >
          <ThemedText style={styles.usernameText}>
            {username || "New User"}
          </ThemedText>
          <ThemedText style={styles.emailText}>
            {email || "No email provided"}
          </ThemedText>
        </Animated.View>
      </Animated.View>

      <View style={styles.row}>
        <ThemedText style={styles.uploadsHeader}>
          Your recent uploads:
        </ThemedText>
        <MaterialCommunityIcons
          style={styles.uploadsHeaderIcon}
          name={"heart"}
          size={20}
          color={"red"}
        />
      </View>

      {/* Items List */}
      <Animated.FlatList
        data={posts}
        renderItem={({ index, item }) => (
          <ListItem
            index={index}
            item={<ThemedText style={styles.cell}>{item.title}</ThemedText>}
            count={item.likeCount}
          />
        )}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.listPadding}
        itemLayoutAnimation={LinearTransition.springify()} // Animate list changes
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No items found.</ThemedText>
        }
      />

      {tags.length > 0 && (
        <>
          <View style={styles.row}>
            <ThemedText style={styles.uploadsHeader}>
              Some of your favorite tags:
            </ThemedText>
            <MaterialCommunityIcons
              style={[styles.uploadsHeaderIcon, { marginTop: 4 }]}
              name={"pound"}
              size={20}
              color={"grey"}
            />
          </View>

          {/* Items List */}
          <Animated.FlatList
            data={tags}
            renderItem={({ index, item }) => (
              <ListItem
                index={index}
                item={
                  <View style={[styles.cell, { padding: 0 }]}>
                    <Tag
                      tag={item.description}
                      idx={index}
                      showCloseIcon={false}
                    />
                  </View>
                }
                count={item.count || 0}
              />
            )}
            keyExtractor={(item, index) =>
              item.id?.toString() || index.toString()
            }
            contentContainerStyle={styles.listPadding}
            itemLayoutAnimation={LinearTransition.springify()} // Animate list changes
          />
        </>
      )}

      {/* Upload Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Update Photo</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {file && (
              <Image
                style={styles.previewImage}
                source={{ uri: file.uri }}
              ></Image>
            )}

            <View style={styles.formPlaceholder}>
              <TouchableOpacity
                onPress={pickFile}
                style={[styles.uploadButton, styles.paddedButton]}
              >
                <ThemedText style={styles.uploadButtonText}>
                  {!file ? "Select image" : "Choose new image"}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {file && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={uploadImageFile}
                disabled={uploading}
              >
                <ThemedText style={styles.uploadButtonText}>
                  {uploading ? "Uploading to the world..." : "Send it!"}
                </ThemedText>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    padding: 24,
    backgroundColor: "black",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarColumn: {
    marginRight: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EEE",
  },
  placeholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  infoColumn: {
    flex: 1,
    justifyContent: "center",
  },
  usernameText: {
    fontSize: 22,
    fontWeight: "700",
  },
  emailText: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },
  listPadding: {
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#AAA",
  },
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
  formPlaceholder: {
    height: 120,
    backgroundColor: "black",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
  },
  paddedButton: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  uploadButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  cell: {
    flex: 2,
    padding: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
  },
  uploadsHeader: {
    flex: 1,
    padding: 5,
    fontSize: 18,
    fontWeight: "bold",
  },
  uploadsHeaderIcon: {
    paddingRight: 18,
  },
  previewImage: {
    height: 200,
    width: 200,
    margin: "auto",
  },
  imageContainer: {
    position: "relative",
  },
  editIcon: {
    color: "antiquewhite",
    position: "absolute",
    right: 0,
    bottom: 0,
  },
});

export default AccountProfile;
