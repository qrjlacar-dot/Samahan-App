import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9FC",
  },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  header: {
    height: 65,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FCE6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  image: {
    width: "100%",
    height: 320,
  },
  textSection: {
    alignItems: "center",
    marginTop: 24,
    minHeight: 160,
  },
  title: {
    color: "#182334",
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    textAlignVertical: "center",
    minHeight: 72,
  },
  subtitle: {
    color: "#64606B",
    fontSize: 17,
    lineHeight: 24,
    marginTop: 10,
    textAlign: "center",
    maxWidth: 340,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingTop: 12,
    marginBottom: 30,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#D9D2D8",
  },
  activeDot: {
    backgroundColor: "#D9478C",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 18,
  },
  skipButton: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  skipText: {
    color: "#D9478C",
    fontSize: 17,
    fontWeight: "700",
  },
  nextButton: {
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: "#D9478C",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
