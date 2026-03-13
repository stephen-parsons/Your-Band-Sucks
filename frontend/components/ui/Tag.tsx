import { Entypo, FontAwesome5 } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function ({
  tag,
  idx,
  onPress,
  showCloseIcon = true,
}: {
  tag: string;
  idx?: number;
  onPress?: () => void;
  showCloseIcon?: boolean;
}) {
  return (
    <View style={styles.tag}>
      <FontAwesome5
        name="hashtag"
        style={styles.hashtag}
        size={12}
        color="black"
      ></FontAwesome5>
      <Text style={styles.tagText}>{tag}</Text>
      {showCloseIcon && (
        <Entypo
          key={idx}
          name="circle-with-cross"
          size={12}
          style={styles.xIcon}
          color="black"
          onPress={onPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
