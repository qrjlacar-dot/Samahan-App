import { StyleSheet } from "react-native";

export const PINK = "#D9679C";
export const PAGE_BG = "#FDFBF9";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  navbar: {
    height: 78,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E8EC",
  },

  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    paddingHorizontal: "6%",
    justifyContent: "flex-start",
    paddingTop: 134,
  },

  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E8DFE4",
    paddingHorizontal: "7%",
    paddingVertical: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: PINK,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    marginBottom: 36,
  },

  inputWrapper: {
    height: 50,
    marginBottom: 22,
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

  resetButton: {
    backgroundColor: PINK,
    borderRadius: 8,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});