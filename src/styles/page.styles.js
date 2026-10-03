import { StyleSheet } from "react-native";
import { scale } from "../constants/scale";
import { COLORS } from "../constants/theme";

// Shared outer spacing only. Titles, logos, forms, and cards belong to pages.
export const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  header: {
    paddingHorizontal: scale(24),
    paddingBottom: scale(8),
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: scale(24),
    paddingTop: scale(20),
    paddingBottom: scale(40),
  },
  body: {
    width: "100%",
  },
});
