import { StyleSheet } from "react-native";

export const editStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F9",
  },
  headerRow: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: "center",
  },
  editTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#CA74A6", // Changed to pink accent color
    marginBottom: 20,
    textAlign: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 24,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3E4ED",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CA74A6",
  },
  formContainer: {
    width: "100%",
    marginTop: 10,
  },
  floatingInputContainer: {
    width: "100%",
    height: 56,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
    position: "relative",
  },
  floatingInputContainerFocused: {
    borderColor: "#CA74A6",
    borderWidth: 1.5,
  },
  inputInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  floatingInput: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
    paddingTop: 4,
  },
  eyeButton: {
    padding: 6,
  },
  confirmButton: {
    width: "100%",
    backgroundColor: "#CA74A6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#CA74A6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
