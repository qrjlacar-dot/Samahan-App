import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  content: { paddingBottom: scale(16) },
  documentHeader: { marginBottom: scale(8) },
  title: {
    fontSize: scaleFont(26),
    lineHeight: scaleFont(34),
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "left",
  },
  updatedAt: {
    fontSize: scaleFont(12),
    lineHeight: scaleFont(19),
    color: COLORS.textMuted,
    textAlign: "left",
    marginTop: scale(8),
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: scale(20),
  },
  logoIcon: { marginRight: scale(2), width: scale(48), height: scale(48) },
  wordmark: { width: scale(145), height: scale(48) },
  section: {
    marginTop: scale(24),
  },
  sectionTitle: {
    fontSize: scaleFont(17),
    lineHeight: scaleFont(25),
    fontWeight: "700",
    color: COLORS.textDark,
  },
  body: {
    marginTop: scale(10),
    fontSize: scaleFont(15),
    lineHeight: scaleFont(25),
    color: COLORS.textDark,
    textAlign: "justify",
  },
  contacts: { marginTop: scale(10) },
  contactLink: {
    minHeight: 44,
    paddingVertical: scale(10),
    justifyContent: "center",
  },
  contactText: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(22),
    color: COLORS.pink,
    fontWeight: "600",
    textDecorationLine: "underline",
    flexShrink: 1,
  },
});
