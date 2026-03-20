import { useThemeColor } from "@/hooks/use-theme-color";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { memo, useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedTextInput = ({
  label,
  value,
  error,
  onChangeText,
  isPassword,
  ...props
}: {
  label: string;
  value: any;
  error: string;
  isPassword: boolean;
} & TextInputProps) => {
  const textInputBackgroundColor = useThemeColor(
    {},
    "textInputBackgroundColor",
  );
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const animation = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    animation.value = withTiming(isFocused || value ? 1 : 0, { duration: 200 });
  }, [value, isFocused]);

  const labelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(animation.value, [0, 1], [0, -32]);
    const fontSize = interpolate(animation.value, [0, 1], [16, 12]);
    const color = interpolateColor(
      animation.value,
      [0, 1],
      ["#999", error ? "#FF3B30" : "#007AFF"],
    );

    return {
      transform: [{ translateY }],
      fontSize,
      color,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      animation.value,
      [0, 1],
      [error ? "#FF3B30" : "#E0E0E0", error ? "#FF3B30" : "#007AFF"],
    );

    const scale = withSpring(isFocused ? 1.01 : 1);

    return {
      borderColor,
      borderWidth: isFocused ? 2 : 1,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.inputContainer,
          containerStyle,
          { backgroundColor: textInputBackgroundColor },
        ]}
      >
        {/* Floating Label */}
        <View style={styles.labelPointerEvents} pointerEvents="none">
          <Animated.Text style={[styles.label, labelStyle]}>
            {label}
          </Animated.Text>
        </View>

        <View style={styles.innerRow}>
          <TextInput
            style={[
              styles.input,
              isPassword && { marginRight: 40 },
              Platform.OS === "web" && { outlineStyle: "none" as any },
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize={isPassword ? "none" : "sentences"}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.iconContainer}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showPassword ? (
                <MaterialCommunityIcons
                  name="eye-off"
                  size={20}
                  color={isFocused ? "#007AFF" : "#999"}
                />
              ) : (
                <MaterialCommunityIcons
                  name="eye"
                  size={20}
                  color={isFocused ? "#007AFF" : "#999"}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 14,
    width: "100%",
  },
  inputContainer: {
    padding: 8,
    marginTop: 5,
    borderRadius: 25,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  labelPointerEvents: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -10,
    zIndex: 1,
  },
  label: {
    fontWeight: "500",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    height: "100%",
    padding: 8,
    zIndex: 2,
  },
  iconContainer: {
    position: "absolute",
    right: 0,
    height: "100%",
    justifyContent: "center",
    paddingLeft: 10,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
});

export default memo(AnimatedTextInput);
