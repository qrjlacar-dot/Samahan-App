import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";

const SECTION_PINK = "#B85C87";

const cardSurface = {
  backgroundColor: COLORS.cardBg,
  borderWidth: 1,
  borderColor: COLORS.cardBorder,
  shadowColor: "#000000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
};

export const styles = StyleSheet.create({
  content: {},

  title: {
    color: COLORS.pink,
    fontSize: scaleFont(28),
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.09)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2
  },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
    textAlign: "center",
    marginTop: scale(2),
    marginBottom: scale(24),
    textShadowColor: "rgba(0, 0, 0, 0.09)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2
  },

  addCard: {
    ...cardSurface,
    borderRadius: scale(16),
    padding: scale(18),
    marginBottom: scale(24),
  },

  sectionTitle: {
    color: SECTION_PINK,
    fontSize: scaleFont(16),
    fontWeight: "700",
  },

  form: {
    marginTop: scale(20),
  },

  listTitle: {
    color: SECTION_PINK,
    fontSize: scaleFont(17),
    fontWeight: "800",
    marginBottom: scale(12),
  },

  emptyCard: {
    ...cardSurface,
    alignItems: "center",
    borderRadius: scale(14),
    padding: scale(25),
  },

  emptyText: {
    color: COLORS.textLight,
    fontSize: scaleFont(13),
    textAlign: "center",
    marginTop: scale(10),
  },

  statusText: {
    color: COLORS.textLight,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(20),
  },

  contactCard: {
    ...cardSurface,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(12),
  },

  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: `${COLORS.pink}1A`,
    alignItems: "center",
    justifyContent: "center",
  },

  contactInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: scale(12),
  },

  contactName: {
    color: COLORS.textDark,
    fontSize: scaleFont(15),
    fontWeight: "700",
  },

  contactPhone: {
    color: COLORS.textLight,
    fontSize: scaleFont(12),
    marginTop: scale(3),
  },

  callButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    borderWidth: 1,
    borderColor: COLORS.pink,
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: scale(8),
  },

  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: scale(8),
    padding: scale(5),
  },
});