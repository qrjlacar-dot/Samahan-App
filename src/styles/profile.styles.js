import { StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },

  content: {
    paddingHorizontal: scale(24),
    paddingTop: scale(20),
    paddingBottom: scale(40),
    alignItems: "center",
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: scale(16),
  },

  avatarCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: "#F3E4ED",
    justifyContent: "center",
    alignItems: "center",
  },

  userName: {
    fontSize: scaleFont(23),
    fontWeight: "bold",
    marginBottom: scale(20),
    color: COLORS.textDark,
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
    height: scale(56),
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },

  lastMenuItem: {
    borderBottomWidth: 0,
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuText: {
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
