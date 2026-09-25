import { StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const PINK = COLORS.pink;
export const PAGE_BG = COLORS.pageBg;

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
    paddingHorizontal: "6%",
    paddingVertical: "2.5%",
    justifyContent: "center",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    // no longer centers content — logo is now pinned separately
  },

  // Logo is absolutely positioned so it can NEVER move,
  // no matter what happens in the scrollable/dynamic content below.
  logoRow: {
    position: "absolute",
    top: scale(100), // fixed distance from top of card — tweak this one number to reposition
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  logoIcon: { width: scale(58), 
    height: scale(58), 
    resizeMode: "contain", 
    marginRight: scale(2) 
  },

  wordmark: { width: scale(196), 
    height: scale(67), 
    resizeMode: "contain" 
  },

  // Everything else now lives in a normal flowing block,
  // pushed down far enough to clear the fixed logo.
  content: {
    width: "100%",
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: scale(110), // must be >= logo top + logo height + desired gap
  },

  errorContainer: {
    height: scale(38),
    justifyContent: "center",
    marginBottom: scale(12),
  },

  errorText: {
    color: COLORS.error,
    textAlign: "left",
    fontSize: scaleFont(14),
    lineHeight: scaleFont(17),
  },

  requiredAsterisk: { 
    color: COLORS.error, 
    fontWeight: "bold"
   },

  inputWrapper: { height: scale(50), 
    marginBottom: scale(15), 
    justifyContent: "center", 
    position: "relative" 
  },

  inputField: {
    height: scale(50),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.input,
    paddingHorizontal: scale(15),
    paddingVertical: 0,
    fontSize: scaleFont(16),
    color: COLORS.textDark,
    backgroundColor: COLORS.cardBg,
    textAlignVertical: "center",
  },

  inputFieldFocused: { 
    borderColor: COLORS.pink 
  },

  inputFieldError: { 
    borderColor: COLORS.error 
  },

  floatingLabel: { position: "absolute", left: scale(12), backgroundColor: COLORS.cardBg, paddingHorizontal: scale(4), zIndex: 1 },

  eyeIcon: { position: "absolute", right: scale(11), top: 0, bottom: 0, width: scale(30), justifyContent: "center", alignItems: "center" },
  forgotText: { color: COLORS.pink, textAlign: "right", marginTop: scale(1), marginBottom: scale(20), fontSize: scaleFont(13), fontWeight: "bold" },
  loginButton: { backgroundColor: COLORS.pink, borderRadius: RADIUS.input, height: scale(48), alignItems: "center", justifyContent: "center" },
  loginButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: scaleFont(15) },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: scale(20) },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E3E3E3" },
  dividerText: { marginHorizontal: scale(9), color: "#8F8F8F", fontSize: scaleFont(12) },
 
  googleButton: {
    flexDirection: "row",
    height: scale(48),
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: RADIUS.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBg,
  },

  googleIcon: { width: scale(18), height: scale(18), marginRight: scale(8) },
  googleButtonText: { fontWeight: "600", color: "#333", fontSize: scaleFont(14) },
  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: scale(65) },
  signupText: { color: COLORS.textMuted, fontSize: scaleFont(13) },
  signupLink: { color: COLORS.pink, fontWeight: "bold", fontSize: scaleFont(13) },
});