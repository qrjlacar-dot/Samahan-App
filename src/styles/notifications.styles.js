import { StyleSheet } from "react-native";
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  RADIUS,
} from "../constants/theme";
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
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  listScroll: {
    flex: 1,
  },
  pillsRow: {
    paddingHorizontal: "6.5%",
    paddingBottom: scale(10),
    alignItems: "center",
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
  pillInactive: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillTextInactive: {
    color: COLORS.pink,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: "6.5%",
    paddingTop: scale(6),
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
  row: {
    minHeight: scale(68),
    borderRadius: RADIUS.input,
    backgroundColor: COLORS.cardBg,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#EAD4E1",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  rowTitle: {
    color: COLORS.textDark,
    fontSize: scaleFont(FONT_SIZES.subtitle),
    fontWeight: "500",
  },
  rowTitleUnread: {
    color: COLORS.pink,
    fontWeight: "700",
  },
  rowBody: {
    color: COLORS.textMuted,
    fontSize: scaleFont(FONT_SIZES.small),
    marginTop: scale(2),
  },
  rowTime: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginTop: scale(3),
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: COLORS.pink,
    marginLeft: SPACING.xs,
  },
  deleteButton: {
    marginLeft: SPACING.xs,
    padding: SPACING.xs,
  },
  stateBox: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  stateText: {
    color: COLORS.textMuted,
    fontSize: scaleFont(FONT_SIZES.subtitle),
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  retryButton: {
    alignSelf: "stretch",
  },
  offNotice: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginBottom: SPACING.md,
  },
});