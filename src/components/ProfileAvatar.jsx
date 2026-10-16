import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";

export function ProfileAvatar({ name = "", photoURL = "", style }) {
  const uri = typeof photoURL === "string" ? photoURL.trim() : "";

  return (
    <AvatarImage
      key={uri}
      name={name}
      uri={uri}
      style={style}
    />
  );
}

function AvatarImage({ name, uri, style }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const initial =
    Array.from(name.trim())[0]?.toLocaleUpperCase() || "?";

  const handleImageError = () => {
    if (attempt === 0) {
      setAttempt(1);
    } else {
      setFailed(true);

      console.warn(
        "The profile photo could not be loaded. Check the image URL and internet connection.",
      );
    }
  };

  return (
    <View
      style={[styles.circle, style]}
      accessibilityLabel={name || "Profile picture"}
    >
      {uri && !failed ? (
        <Image
          key={`${uri}-${attempt}`}
          source={{ uri }}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="none"
          onError={handleImageError}
        />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  initial: {
    color: COLORS.pink,
    fontSize: scaleFont(50),
    fontWeight: "bold",
  },
});