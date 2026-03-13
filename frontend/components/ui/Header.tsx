import { Text } from "react-native";

export function Header({ text }: { text: string }) {
  return (
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
  );
}
