import { StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const PINK = COLORS.pink;
export const PAGE_BG = COLORS.pageBg;

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.pageBg },
  navbar: {
    height: scale(76),
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EC",
  },
  backButton: { width: scale(36), height: scale(36), alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: "6%", paddingTop: scale(140) },
  card: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: "7%",
    paddingVertical: scale(44),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  title: { fontSize: scaleFont(32), fontWeight: "bold", color: COLORS.pink, textAlign: "center" },
  subtitle: { fontSize: scaleFont(15), color: COLORS.textMuted, marginTop: scale(6), textAlign: "center", marginBottom: scale(36) },
  inputWrapper: { height: scale(50), marginBottom: scale(22), justifyContent: "center", position: "relative" },
  inputField: {
    height: scale(50),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.input,
    paddingHorizontal: scale(15),
    paddingVertical: 0,
    fontSize: scaleFont(16),
    color: COLORS.textDark,
    backgroundColor: COLORS.cardBg,
    textAlignVertical: "center",
  },
  inputFieldFocused: { borderColor: COLORS.pink },
  floatingLabel: { position: "absolute", left: scale(12), backgroundColor: COLORS.cardBg, paddingHorizontal: scale(4), zIndex: 1 },
  eyeIcon: { position: "absolute", right: scale(11), top: 0, bottom: 0, width: scale(30), justifyContent: "center", alignItems: "center" },
  resetButton: { backgroundColor: COLORS.pink, borderRadius: RADIUS.input, height: scale(48), alignItems: "center", justifyContent: "center", marginTop: scale(16) },
  resetButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: scaleFont(15) },
});