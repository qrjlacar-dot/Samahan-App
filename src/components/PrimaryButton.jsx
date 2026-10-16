import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";
import { styles } from "../styles/common.styles";

export function PrimaryButton({
  title,
  onPress,
  style,
  textStyle,
  iconName,
  iconSize = scale(20),
  disabled = false,
  loading = false,
  activeOpacity = 0.8,
}) {
  const [processing, setProcessing] = useState(false);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);

  const isLoading = loading || processing;
  const isDisabled = disabled || isLoading;

  const textColor =
    StyleSheet.flatten([styles.primaryButtonText, textStyle])?.color ||
    COLORS.cardBg;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handlePress = async (event) => {
    if (disabled || loading || processingRef.current) return;

    processingRef.current = true;

    try {
      const result = onPress?.(event);

      if (result && typeof result.then === "function") {
        if (mountedRef.current) setProcessing(true);
        await result;
      }
    } finally {
      processingRef.current = false;

      if (mountedRef.current) setProcessing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.primaryButton,
        style,
        disabled && !isLoading && styles.disabledButton,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: isDisabled,
        busy: isLoading,
      }}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.primaryButtonIcon}
        />
      ) : iconName ? (
        <Ionicons
          name={iconName}
          size={iconSize}
          color={textColor}
          style={styles.primaryButtonIcon}
        />
      ) : null}

      <Text style={[styles.primaryButtonText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}