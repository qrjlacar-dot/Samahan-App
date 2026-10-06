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
    elevation: 3
  },
  logoRow: {
    position: "absolute",
    top: scale(100),
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  logoIcon: {
    width: scale(58),
    height: scale(58),
    resizeMode: "contain",
    marginRight: scale(2)
  },
  wordmark: {
    width: scale(196),
    height: scale(67),
    resizeMode: "contain"
  },
  content: {
    width: "100%",
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: scale(110)
  },
  errorContainer: {
    height: scale(38),
    justifyContent: "center",
    marginBottom: scale(12)
  },
  errorText: {
    color: COLORS.error,
    textAlign: "left",
    fontSize: scaleFont(14),
    lineHeight: scaleFont(17)
  },
  forgotText: {
    color: COLORS.pink,
    textAlign: "right",
    marginTop: scale(1),
    marginBottom: scale(20),
    fontSize: scaleFont(13),
    fontWeight: "bold"
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: scale(20)
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E3E3E3"
  },
  dividerText: {
    marginHorizontal: scale(9),
    color: "#8F8F8F",
    fontSize: scaleFont(12)
  },
  googleButton: {
    flexDirection: "row",
    height: scale(48),
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: RADIUS.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBg
  },
  googleIcon: {
    width: scale(18),
    height: scale(18),
    marginRight: scale(8)
  },
  googleButtonText: {
    fontWeight: "600",
    color: "#333",
    fontSize: scaleFont(14)
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(65)
  },
  signupText: {
    color: COLORS.textMuted,
    fontSize: scaleFont(13)
  },
  signupLink: {
    color: COLORS.pink,
    fontWeight: "bold",
    fontSize: scaleFont(13)
  }
});
