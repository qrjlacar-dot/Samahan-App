import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  form: { width: "100%" },
  content: {
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    marginBottom: scale(20),
  },
  title: {
    fontSize: scaleFont(28),
    fontWeight: "bold",
    color: COLORS.pink,
  },
  subtitle: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scale(4),
  },
  avatarWrapper: {
    alignSelf: "center",
    marginBottom: scale(24),
  },
  avatarCircle: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    backgroundColor: "#F3D9E6",
    alignItems: "center",
    justifyContent: "center",
  },
  compactAvatarWrapper: { marginBottom: scale(20) },
  compactAvatarCircle: { width: scale(80), height: scale(80), borderRadius: scale(40) },
  compactLoginRow: { marginTop: scale(20) },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  errorText: {
    color: COLORS.error,
    textAlign: "left",
    marginBottom: scale(12),
    fontSize: scaleFont(14),
  },
  signUpButton: {
    marginTop: scale(6),
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(24),
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: scaleFont(13),
  },
  loginLink: {
    color: COLORS.pink,
    fontWeight: "bold",
    fontSize: scaleFont(13),
  },
});
