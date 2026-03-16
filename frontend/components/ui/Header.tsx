import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "aws-amplify/auth";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export function Header({
  text,
  signOut: shouldSignOut,
}: {
  text: string;
  signOut: boolean;
}) {
  const [isModalVisible, setModalVisible] = useState(false);
  return (
    <>
      <View style={{ position: "relative", justifyContent: "center" }}>
        <Text
          style={{
            fontSize: 20,
            color: "white",
            textAlign: "center",
            backgroundColor: "black",
            padding: 10,
            fontWeight: "bold",
          }}
        >
          {text}
        </Text>
        {shouldSignOut && (
          <Pressable
            style={{ position: "absolute", left: "90%" }}
            onPress={() => {
              setModalVisible(true);
            }}
          >
            <FontAwesome5 name="sign-out-alt" size={24} color="white" />
          </Pressable>
        )}
      </View>

      {shouldSignOut && (
        <Modal
          visible={isModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInUp} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Do you want to sign out?</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialCommunityIcons name="close" color="#333" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.formPlaceholder}>
                <TouchableOpacity
                  //TODO: show loader
                  //a gif would be a funny loader, beavis and butthead maybe
                  onPress={() => signOut()}
                  style={[styles.uploadButton, styles.paddedButton]}
                >
                  <Text style={styles.uploadButtonText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
});
