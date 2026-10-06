import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, TextInput, TouchableOpacity, View } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";
import { styles } from "../styles/common.styles";

export function FloatingInput({
  label,
  value = "",
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  showRequired = false,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;
  const hasError = showRequired && !value.trim();
  useEffect(() => {
    const animation = Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false
    });
    animation.start();
    return () => animation.stop();
  }, [animatedLabel, isFocused, value]);
  const labelStyle = {
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [scale(13), scale(-8)]
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [scaleFont(16), scaleFont(12)]
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.textLight, COLORS.pink]
    })
  };
  return (
    <View style={[styles.inputWrapper, style]}>
      <Animated.Text
        pointerEvents="none"
        style={[styles.floatingLabel, labelStyle]}
      >
        {label}
        {showRequired && <Text style={styles.requiredAsterisk}>
          {" *"}
        </Text>}
      </Animated.Text>
      <TextInput
        autoCorrect={false}
        accessibilityLabel={label}
        {...inputProps}
        style={[styles.inputField, secureTextEntry && styles.inputFieldPassword, isFocused && styles.inputFieldFocused, hasError && styles.inputFieldError, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        onFocus={event => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        secureTextEntry={secureTextEntry && !showValue}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={isFocused && !value ? label : undefined}
        placeholderTextColor={COLORS.placeholder}
      />
      {secureTextEntry && <TouchableOpacity
        style={styles.eyeIcon}
        onPress={() => setShowValue(current => !current)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={showValue ? "Hide password" : "Show password"}
      >
        <Ionicons
          name={showValue ? "eye-off-outline" : "eye-outline"}
          size={scale(19)}
          color={COLORS.textLight}
        />
      </TouchableOpacity>}
    </View>
  );
}
