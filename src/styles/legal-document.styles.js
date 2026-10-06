import { StyleSheet } from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";

export const styles = StyleSheet.create({
  content: {},
  title: { fontSize: scale(24), fontWeight: "bold", color: COLORS.textDark },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: scale(28)
  },
  logoIcon: {
    marginRight: scale(2),
    width: scale(56),
    height: scale(56)
  },
  wordmark: {
    width: scale(145),
    height: scale(56)
  },
  draftBadge: {
    alignSelf: "flex-start",
    marginTop: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
    backgroundColor: "#FCE8F2",
    color: COLORS.pink,
    fontWeight: "bold"
  },
  body: {
    marginTop: scale(20),
    fontSize: scale(15),
    lineHeight: scale(24),
    color: COLORS.textDark,
    textAlign: "justify"
  }
});
