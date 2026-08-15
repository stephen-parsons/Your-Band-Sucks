import { AnimatedCount } from "@/components/ui/AnimtedCount";
import { Post, Posts, Tag as TagType } from "@/service/posts";
import { uploadToS3, UserProfile, UserService } from "@/service/user";
import { assertSafeFilename, UnsafeFilenameError } from "@/util/filename";
import {
    FontAwesome,
    Ionicons,
    MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";
import Animated, {
    cancelAnimation,
    FadeInDown,
    FadeInRight,
    interpolateColor,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AudioProvider from "../audio/AudioManager";
import { AudioPost } from "./AudioPost";
import S3Image from "./S3Image";
import { ThemedText } from "./themed-text";
import { Header } from "./ui/Header";
import { TableTab } from "./ui/TableTab";
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
  mostPopularSongs: Posts | null;
  mostPopularLoading: boolean;
  recentlyLikedSongs: Posts | null;
  recentlyLikedLoading: boolean;
  highlightSongId?: number;
  onHighlightConsumed?: () => void;
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
  highlightSongId,
  onHighlightConsumed,
}: AccountProfileProps) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [file, setFile] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] =
    useState<ProfileView>("Recently uploaded");

  useEffect(() => {
    if (highlightSongId === undefined) {
      return;
    }
    setActiveView("Recently uploaded");
  }, [highlightSongId]);

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

  const tableSongs: Posts = useMemo(() => {
    switch (activeView) {
      case "Favorite Songs":
        return recentlyLikedSongs ?? [];
      case "Most Popular":
        return mostPopularSongs ?? [];
      case "Recently uploaded":
        return posts;
      default:
        return [];
    }
  }, [activeView, recentlyLikedSongs, mostPopularSongs, posts]);

  const openAudioPost = useCallback((post: Post): void => {
    Vibration.vibrate(40);
    setSelectedPost(post);
  }, []);

  const closeAudioPost = useCallback((): void => {
    AudioProvider.clearActivePlayer();
    setSelectedPost(null);
  }, []);

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

      <TableTab
        tabs={PROFILE_VIEWS}
        activeTab={activeView}
        onChange={setActiveView}
      />

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
          renderItem={({ index, item }: { index: number; item: Post }) => (
            <ListItem
              index={index}
              item={<ThemedText style={styles.cell}>{item.title}</ThemedText>}
              count={item.likeCount}
              highlighted={
                highlightSongId !== undefined && item.id === highlightSongId
              }
              onHighlightComplete={onHighlightConsumed}
              onPress={() => openAudioPost(item)}
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

      {/* Audio post modal */}
      <Modal
        visible={selectedPost !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAudioPost}
      >
        <SafeAreaView
          edges={{ top: "additive", bottom: "additive" }}
          style={{ padding: 20, ...styles.audioModalContainer }}
        >
          <View style={styles.audioModalHeader}>
            <ThemedText style={styles.audioModalTitle} numberOfLines={1}>
              {selectedPost?.title ?? ""}
            </ThemedText>
            <TouchableOpacity
              onPress={closeAudioPost}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss audio post"
            >
              <MaterialCommunityIcons name="close" color="#EEE" size={28} />
            </TouchableOpacity>
          </View>
          {selectedPost ? (
            <View style={{ flex: 1 }}>
              <AudioPost {...selectedPost} likeDisabled />
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

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
  onPress,
  highlighted = false,
  onHighlightComplete,
}: {
  index: number;
  count: number;
  item: ReactNode;
  onPress?: () => void;
  highlighted?: boolean;
  onHighlightComplete?: () => void;
}) {
  const scale = useSharedValue(1);
  const highlight = useSharedValue(highlighted ? 1 : 0);

  useEffect(() => {
    if (!highlighted) {
      highlight.value = withTiming(0, { duration: 200 });
      return;
    }

    highlight.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450 }),
        withTiming(0.35, { duration: 450 }),
      ),
      4,
      false,
    );

    const timeout = setTimeout(() => {
      cancelAnimation(highlight);
      highlight.value = withTiming(0, { duration: 400 });
      onHighlightComplete?.();
    }, 2800);

    return () => {
      clearTimeout(timeout);
      cancelAnimation(highlight);
    };
  }, [highlighted, highlight, onHighlightComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.7 + scale.value * 0.3,
    backgroundColor: interpolateColor(
      highlight.value,
      [0, 1],
      ["rgba(29,185,84,0)", "rgba(29,185,84,0.28)"],
    ),
    borderColor: interpolateColor(
      highlight.value,
      [0, 1],
      ["rgba(29,185,84,0)", "rgba(29,185,84,0.85)"],
    ),
    borderWidth: highlight.value > 0.05 ? 1 : 0,
    borderRadius: 10,
  }));

  const content = (
    <Animated.View
      style={[styles.row, onPress || highlighted ? animatedStyle : null]}
    >
      {item}
      <AnimatedCount value={count || 0} />
    </Animated.View>
  );

  if (!onPress) {
    return <View key={index}>{content}</View>;
  }

  return (
    <Pressable
      key={index}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
      }}
      android_ripple={{ color: "rgba(255,255,255,0.08)" }}
    >
      {content}
    </Pressable>
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
  audioModalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  audioModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  audioModalTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default AccountProfile;
