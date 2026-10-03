import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS, FONT_SIZES, RADIUS, SPACING } from "../constants/theme";

// Colors with no match in theme.js yet. Candidates to move into COLORS.
const LOCAL_COLORS = {
  pinkSoft: "#F7DCEB",
  // icon badge background
  success: "#4F9B6D" // "Open" status
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: scale(130)
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
    marginBottom: SPACING.lg,
  },
  routeList: {
    gap: SPACING.md
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  routeIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: RADIUS.input,
    backgroundColor: LOCAL_COLORS.pinkSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  routeInfo: {
    flex: 1,
    marginLeft: SPACING.sm
  },
  routeName: {
    color: COLORS.pink,
    fontSize: scaleFont(FONT_SIZES.subtitle),
    fontWeight: "700"
  },
  distance: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginTop: scale(3)
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  detailsText: {
    color: COLORS.textLight,
    fontSize: scaleFont(FONT_SIZES.small),
    marginLeft: scale(4)
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  statusDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(5) / 2,
    backgroundColor: LOCAL_COLORS.success,
    marginRight: scale(5)
  },
  openText: {
    color: LOCAL_COLORS.success,
    fontSize: scaleFont(FONT_SIZES.small),
    fontWeight: "700"
  },
  directionsButton: {
    backgroundColor: COLORS.pink,
    borderRadius: RADIUS.input,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.sm
  },
  directionsButtonText: {
    color: COLORS.cardBg,
    fontSize: scaleFont(FONT_SIZES.body),
    fontWeight: "700"
  },
  addButton: {
    position: "absolute",
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: scale(54),
    height: scale(54),
    borderRadius: scale(54) / 2,
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6
  },
  addButtonText: {
    color: COLORS.cardBg,
    fontSize: scaleFont(FONT_SIZES.titleLarge),
    fontWeight: "300",
    marginTop: -scale(3)
  }
});
