import { StyleSheet } from "react-native";
import { scale, scaleFont } from "../constants/scale";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },

  content: {
    paddingHorizontal: scale(24),
    paddingTop: scale(30),
    paddingBottom: scale(40),
    alignItems: "center",
  },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarWrapper: {
    alignSelf: "center",
    marginBottom: scale(16),
  },

  avatarCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: "#F3D9E6",
    alignItems: "center",
    justifyContent: "center",
  },

  identity: {
    width: "100%",
    alignItems: "center",
    marginBottom: scale(28),
  },

  userName: {
    width: "100%",
    fontSize: scaleFont(23),
    fontWeight: "bold",
    marginBottom: scale(6),
    color: COLORS.textDark,
    textAlign: "center",
  },

  userEmail: {
    width: "100%",
    fontSize: scaleFont(13),
    color: COLORS.textLight,
    textAlign: "center",
  },

  menuCard: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    borderRadius: scale(16),
    paddingVertical: scale(4),
    paddingHorizontal: scale(16),
    marginBottom: scale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },

  lastMenuItem: {
    borderBottomWidth: 0,
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: scale(10),
  },

  menuText: {
    flexShrink: 1,
    fontSize: scaleFont(15),
    color: COLORS.textDark,
    marginLeft: scale(14),
    fontWeight: "500",
  },

  signOutButton: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    paddingVertical: scale(14),
    borderRadius: scale(16),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },

  signOutText: {
    fontSize: scaleFont(15),
    color: "#E57373",
    fontWeight: "600",
  },
});