import { StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: "space-between",
    backgroundColor: COLORS.pageBg,
  },

  headerContainer: {
    width: "100%",
    marginBottom: 4,
  },

  greetingTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.pink,
    marginBottom: 2,
  },

  subTitle: {
    fontSize: 14,
    color: COLORS.textDark,
  },

  mapCardContainer: {
    flex: 1,
    minHeight: 180,
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    marginVertical: 12,
    position: "relative",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.border,
  },

  locationPill: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },

  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.pink,
    marginRight: 8,
  },

  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },

  emergencyCard: {
    width: "100%",
    backgroundColor: "#FFF0F3",
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FAD2E1",
  },

  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sirenBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sirenIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.cardBg,
  },

  emergencyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5A1226",
  },

  emergencyActionsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },

  contactButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  blueCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#3A75C4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  redCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  hotlineText: {
    color: COLORS.cardBg,
    fontWeight: "bold",
    fontSize: 14,
  },

  buttonLabel: {
    fontSize: 10,
    color: COLORS.textDark,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 13,
    height: 28,
    textAlignVertical: "center",
  },

  divider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.cardBorder,
    alignSelf: "center",
  },
});