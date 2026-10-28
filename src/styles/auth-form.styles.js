import { StyleSheet } from "react-native";
import { scale } from "../constants/scale";
import { COLORS, RADIUS } from "../constants/theme";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.pageBg },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  page: { paddingHorizontal: "6%", paddingVertical: scale(12), justifyContent: "center" },
  card: {
    width: "100%",
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: "7%",
    paddingVertical: scale(26),
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  footer: { marginTop: scale(12) },
});
