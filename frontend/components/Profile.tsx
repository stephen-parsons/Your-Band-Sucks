import { AnimatedCount } from "@/components/ui/AnimtedCount";
import { Tag as TagType } from "@/service/posts";
import {
  ProfileSong,
  uploadToS3,
  UserProfile,
  UserService,
} from "@/service/user";
import { assertSafeFilename, UnsafeFilenameError } from "@/util/filename";
import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { Header } from "./ui/Header";
import Tag from "./ui/Tag";

//in megabytes
const MAX_FILE_SIZE = 10;

//in bytes
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE * 1024 * 1024;

const PROFILE_VIEWS = [
  "Favorite Songs",
  "Most Popular",
  "Recently uploaded",
  "Favorite Tags",
] as const;

type ProfileView = (typeof PROFILE_VIEWS)[number];

interface AccountProfileProps extends UserProfile {
  service: UserService;
  refreshData: () => void;
  mostPopularSongs: ProfileSong[] | null;
  mostPopularLoading: boolean;
  recentlyLikedSongs: ProfileSong[] | null;
  recentlyLikedLoading: boolean;
}

class MaxFileSizeError extends Error {
  constructor() {
    super();
    this.message = `Max file size is ${MAX_FILE_SIZE} Mb`;
  }
}

const AccountProfile = ({
  name: username,
  avatar: avatarKey,
  email,
  songs: posts,
  tags,
  refreshData,
  service,
  mostPopularSongs,
  mostPopularLoading,
  recentlyLikedSongs,
  recentlyLikedLoading,
}: AccountProfileProps) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] =
    useState<ProfileView>("Recently uploaded");

  const uploadImageFile = useCallback(async () => {
    if (uploading) {
      console.info("Already uploading...");
      return;
    }

    if (!file) {
      Alert.alert("Please select a file");
      return;
    }

    if (file.fileSize ?? 0 > MAX_FILE_SIZE_BYTES) throw new MaxFileSizeError();

    try {
      setUploading(true);

      const filename = file.fileName || "avatar";
      assertSafeFilename(filename);

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

        setFile(null);
        refreshData();

        console.info("Upload successful!");
        Alert.alert("Upload successful");
      } else
        throw new Error(`Upload failed with statu code ${uploadResult.status}`);
    } catch (err) {
      console.error(err);
      if (
        err instanceof MaxFileSizeError ||
        err instanceof UnsafeFilenameError
      ) {
        Alert.alert("Error:", err.message);
      } else Alert.alert("Upload failed");
    } finally {
      setUploading(false);
      setModalVisible(false);
    }
  }, [file]);

  const pickFile = useCallback(async () => {
    try {
      // No permission request is necessary for launching the image library
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", // Restrict to images only
        allowsEditing: true, // Allows user to crop the image
        aspect: [4, 3], // Optional: aspect ratio for editing
        quality: 1, // Optional: image quality (0 to 1)
      });

      const file = result.assets && result.assets[0];

      if (file?.fileSize ?? 0 > MAX_FILE_SIZE_BYTES)
        throw new MaxFileSizeError();

      if (file?.fileName) {
        assertSafeFilename(file.fileName);
      }

      if (!result.canceled) {
        if (file?.type !== "image") throw new Error("Only images allowed!");
        setFile(result.assets[0]);
      }
    } catch (err) {
      if (
        err instanceof MaxFileSizeError ||
        err instanceof UnsafeFilenameError
      ) {
        Alert.alert("Error:", err.message);
      } else Alert.alert("Error picking file");
    }
  }, []);

  const viewMeta = useMemo(() => {
    switch (activeView) {
      case "Favorite Songs":
        return {
          header: "Songs you liked:",
          icon: "heart" as const,
          iconColor: "red",
        };
      case "Most Popular":
        return {
          header: "Your most popular:",
          icon: "fire" as const,
          iconColor: "orange",
        };
      case "Favorite Tags":
        return {
          header: "We hear you like these tags:",
          icon: "pound" as const,
          iconColor: "grey",
        };
      case "Recently uploaded":
      default:
        return {
          header: "Some cool stuff you just shared:",
          icon: "heart" as const,
          iconColor: "red",
        };
    }
  }, [activeView]);

  const isTableLoading =
    (activeView === "Most Popular" &&
      (mostPopularLoading || mostPopularSongs === null)) ||
    (activeView === "Favorite Songs" &&
      (recentlyLikedLoading || recentlyLikedSongs === null));

  const tableSongs: ProfileSong[] = useMemo(() => {
    switch (activeView) {
      case "Favorite Songs":
        return recentlyLikedSongs ?? [];
      case "Most Popular":
        return mostPopularSongs ?? [];
      case "Recently uploaded":
        return posts.map((post, index) => ({
          id: post.id ?? index,
          title: post.title,
          likeCount: post.likeCount,
        }));
      default:
        return [];
    }
  }, [activeView, recentlyLikedSongs, mostPopularSongs, posts]);

  return (
    <SafeAreaView style={styles.container}>
      <Header text={"Looking good!"} signOut />
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.duration(800).springify()}
        style={styles.header}
      >
        <View style={styles.avatarColumn}>
          <View style={styles.imageContainer}>
            {avatarKey ? (
              <S3Image source={avatarKey} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" color="#999" size={90} />
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome
                style={styles.editIcon}
                name="pencil-square-o"
                size={20}
                color="black"
              />
            </TouchableOpacity>
          </View>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.tabBar}
      >
        {PROFILE_VIEWS.map((view) => {
          const isActive = activeView === view;
          return (
            <TouchableOpacity
              key={view}
              onPress={() => setActiveView(view)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <ThemedText
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {view}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <ThemedText style={styles.uploadsHeader}>{viewMeta.header}</ThemedText>
        <MaterialCommunityIcons
          style={styles.uploadsHeaderIcon}
          name={viewMeta.icon}
          size={20}
          color={viewMeta.iconColor}
        />
      </View>

      {isTableLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : activeView === "Favorite Tags" ? (
        <Animated.FlatList
          data={tags ?? []}
          renderItem={({ index, item }: { index: number; item: TagType }) => (
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
          itemLayoutAnimation={LinearTransition.springify()}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>No items found.</ThemedText>
          }
        />
      ) : (
        <Animated.FlatList
          data={tableSongs}
          renderItem={({
            index,
            item,
          }: {
            index: number;
            item: ProfileSong;
          }) => (
            <ListItem
              index={index}
              item={<ThemedText style={styles.cell}>{item.title}</ThemedText>}
              count={item.likeCount}
            />
          )}
          keyExtractor={(item, index) =>
            item.id?.toString() || index.toString()
          }
          contentContainerStyle={styles.listPadding}
          itemLayoutAnimation={LinearTransition.springify()}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>No items found.</ThemedText>
          }
        />
      )}

      {/* Upload Modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Express yourself
              </ThemedText>
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

const styles = StyleSheet.create({
  container: {
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
    marginTop: 4,
  },
  tabBar: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 8,
    alignItems: "center",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#1DB954",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  tabTextActive: {
    color: "#fff",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
