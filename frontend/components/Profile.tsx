import { AnimatedCount } from "@/components/ui/AnimtedCount";
import { UserProfile } from "@/service/user";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { ReactNode, useCallback, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
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
import { Header } from "./ui/Header";
import Tag from "./ui/Tag";

const AccountProfile = ({
  name: username,
  avatar: avatarUrl,
  email,
  songs: posts,
  tags,
}: UserProfile) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [file, setFile] = useState<null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadSubmit = () => {
    // You'll handle your upload logic here!
    setModalVisible(false);
  };

  //TODO: sanitize filename and check file size limit (in bytes)
  const pickFile = useCallback(async () => {
    alert("Nice!");
    //   try {
    //     const result = await DocumentPicker.getDocumentAsync({
    //       multiple: false,
    //     });

    //     if (!result.canceled) {
    //       setFile(result.assets[0]);
    //     } else {
    //       console.log("Document selection cancelled");
    //     }
    //   } catch (err) {
    //     console.error(err);
    //     Alert.alert("Error picking file");
    //   }
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
      <Header text={"Looking good!"} />
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.duration(800).springify()}
        style={styles.header}
      >
        <View style={styles.avatarColumn}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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
          <Text style={styles.usernameText}>{username || "New User"}</Text>
          <Text style={styles.emailText}>{email || "No email provided"}</Text>
        </Animated.View>
      </Animated.View>

      <Text style={styles.uploadsHeader}>Your recent uploads:</Text>

      {/* Items List */}
      <Animated.FlatList
        data={posts}
        renderItem={({ index, item }) => (
          <ListItem
            index={index}
            item={<Text style={styles.cell}>{item.title}</Text>}
            count={item.likeCount}
          />
        )}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.listPadding}
        itemLayoutAnimation={LinearTransition.springify()} // Animate list changes
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found.</Text>
        }
      />

      {tags.length > 0 && (
        <>
          <Text style={styles.uploadsHeader}>Some of your favorite tags:</Text>

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
              <Text style={styles.modalTitle}>Update Photo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" color="#333" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.formPlaceholder}>
              <Pressable
                onPress={pickFile}
                style={[styles.uploadButton, styles.paddedButton]}
              >
                <Text style={styles.uploadButtonText}>Select File</Text>
              </Pressable>
            </View>

            {file && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadSubmit}
              >
                <Text style={styles.uploadButtonText}>Confirm Upload</Text>
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
    color: "lightgray",
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
    width: "100%",
    backgroundColor: "lightgrey",
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
    backgroundColor: "lightgrey",
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
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cell: {
    color: "white",
    flex: 2,
    padding: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
  },
  uploadsHeader: {
    padding: 5,
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default AccountProfile;
