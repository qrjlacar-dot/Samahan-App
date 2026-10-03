import { StyleSheet } from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  content: {},
  title: {
    marginTop: scale(24),
    fontSize: scale(25),
    fontWeight: "bold",
    color: COLORS.textDark,
    textAlign: "center",
  },
  subtitle: {
    marginTop: scale(10),
    fontSize: scale(15),
    lineHeight: scale(23),
    color: COLORS.textLight,
    textAlign: "center",
  },
  logo: {
    width: scale(76),
    height: scale(76),
    alignSelf: "center"
  },
  links: {
    marginTop: scale(36),
    gap: scale(14)
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(17),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#F0D7E3",
    backgroundColor: "#FFF8FB"
  },
  linkText: {
    flex: 1,
    marginLeft: scale(14)
  },
  linkTitle: {
    fontSize: scale(16),
    fontWeight: "bold",
    color: COLORS.textDark
  },
  linkDescription: {
    marginTop: scale(3),
    fontSize: scale(12),
    color: COLORS.textLight
  },
  draftNote: {
    marginTop: scale(25),
    fontSize: scale(12),
    color: COLORS.textLight,
    textAlign: "center"
  },
  continueButton: {
    marginTop: scale(28),
    minHeight: scale(54),
    borderRadius: scale(12),
  },
  continueButtonText: { fontSize: scale(16) },
});
