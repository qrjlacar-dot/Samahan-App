import { StyleSheet } from "react-native";

export const PINK = "#D9679C";
export const PAGE_BG = "#F7EFF3";

export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  header: {
    paddingHorizontal: "6.5%",
    paddingTop: "4%",
    paddingBottom: "3%",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: PINK,
  },

  subtitle: {
    fontSize: 14,
    color: "#3A2E34",
    marginTop: 6,
  },

  pillsRow: {
    paddingHorizontal: "6.5%",
    paddingBottom: 18,
  },

  pill: {
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 18,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  scrollContent: {
    paddingHorizontal: "6.5%",
    paddingBottom: 24,
  },

  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    fontSize: 15,
    fontWeight: "bold",
    color: PINK,
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  placeholderRow: {
    height: 68,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAD4E1",
  },
});
