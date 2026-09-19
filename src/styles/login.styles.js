import { StyleSheet } from "react-native";

export const PINK = "#D9679C";
export const PAGE_BG = "#F7EFF3";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingHorizontal: "6%",
    paddingVertical: "2.5%",
    justifyContent: "center",
  },

  card: {
    height: "78%",
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8DFE4",
    paddingHorizontal: "7%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: "center",
  },

  content: {
    width: "100%",
    alignSelf: "center",
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 31,
  },

  logoIcon: {
    width: 58,
    height: 58,
    resizeMode: "contain",
    marginRight: 2,
  },

  wordmark: {
    width: 196,
    height: 67,
    resizeMode: "contain",
  },

  errorText: {
    color: "#D33",
    textAlign: "left",
    marginBottom: 12,
    fontSize: 14,
  },

  requiredAsterisk: {
    color: "#D33",
    fontWeight: "bold",
  },

  inputWrapper: {
    height: 50,
    marginBottom: 15,
    justifyContent: "center",
    position: "relative",
  },

  inputField: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E8D3DE",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 0,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "center",
  },

  inputFieldFocused: {
    borderColor: PINK,
  },

  inputFieldError: {
    borderColor: "#D33",
  },

  floatingLabel: {
    position: "absolute",
    left: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    zIndex: 1,
  },

  eyeIcon: {
    position: "absolute",
    right: 11,
    top: 0,
    bottom: 0,
    width: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  forgotText: {
    color: PINK,
    textAlign: "right",
    marginTop: 1,
    marginBottom: 18,
    fontSize: 13,
    fontWeight: "500",
  },

  loginButton: {
    backgroundColor: PINK,
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E3E3E3",
  },

  dividerText: {
    marginHorizontal: 9,
    color: "#8F8F8F",
    fontSize: 12,
  },

  googleButton: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  googleButtonText: {
    fontWeight: "600",
    color: "#333",
    fontSize: 14,
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },

  signupText: {
    color: "#666",
    fontSize: 13,
  },

  signupLink: {
    color: PINK,
    fontWeight: "bold",
    fontSize: 13,
  },
});