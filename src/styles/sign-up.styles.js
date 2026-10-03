import { StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
    paddingHorizontal: "6%",
    paddingVertical: "2.5%",
    justifyContent: "center"
  },
  card: {
    height: "82%",
    width: "100%",
    alignSelf: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: "7%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "center"
  },
  content: {
    width: "100%",
    alignSelf: "center"
  },
  headerRow: {
    marginBottom: scale(22)
  },
  title: {
    fontSize: scaleFont(28),
    fontWeight: "bold",
    color: COLORS.pink
  },
  subtitle: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scale(4)
  },
  avatarWrapper: {
    alignSelf: "center",
    marginBottom: scale(24)
  },
  avatarCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: "#F3D9E6",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: COLORS.pink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  errorText: {
    color: COLORS.error,
    textAlign: "left",
    marginBottom: scale(12),
    fontSize: scaleFont(14)
  },
  signUpButton: {
    marginTop: scale(6)
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(36)
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: scaleFont(13)
  },
  loginLink: {
    color: COLORS.pink,
    fontWeight: "bold",
    fontSize: scaleFont(13)
  }
});
