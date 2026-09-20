import { StyleSheet } from "react-native";

export const PINK = "#D9679C";
export const PAGE_BG = "#FDFBF9";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
    paddingHorizontal: "6%",
    paddingVertical: "2.5%",
    justifyContent: "center",
  },

  card: {
    height: "82%",
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

  headerRow: {
    marginBottom: 22,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: PINK,
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 2,
  },

  avatarWrapper: {
    alignSelf: "center",
    marginBottom: 24,
  },

  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#F3D9E6",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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

  signUpButton: {
    backgroundColor: PINK,
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  signUpButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },

  loginText: {
    color: "#666",
    fontSize: 13,
  },

  loginLink: {
    color: PINK,
    fontWeight: "bold",
    fontSize: 13,
  },
});