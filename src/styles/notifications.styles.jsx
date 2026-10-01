import { StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },

  title: {
    color: COLORS.pink,
    fontSize: scaleFont(28),
    fontWeight: "bold",
    marginTop: SPACING.md,
  },

  subtitle: {
    color: COLORS.textMuted,
    fontSize: scaleFont(15),
    marginTop: scale(2),
  },

  pillsRow: {
    paddingHorizontal: "6.5%",
    paddingBottom: SPACING.md,
  },

  pill: {
    paddingHorizontal: SPACING.md,
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },

  pillText: {
    fontSize: scaleFont(FONT_SIZES.small),
    fontWeight: "600",
    color: COLORS.cardBg,
  },

  scrollContent: {
    paddingHorizontal: "6.5%",
    paddingBottom: SPACING.lg,
  },

  section: {
    marginBottom: SPACING.lg,
  },

  sectionHeader: {
    fontSize: scaleFont(FONT_SIZES.subtitle),
    fontWeight: "bold",
    color: COLORS.pink,
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },

  placeholderRow: {
    height: scale(68),
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.cardBg,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  placeholderIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#EAD4E1",
  },
});