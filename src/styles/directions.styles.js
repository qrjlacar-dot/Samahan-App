import { Dimensions, StyleSheet } from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8FA",
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },

  /* BOTTOM SHEET - OVERSIZED HEIGHT PREVENTS BOTTOM GAP */
  bottomSheet: {
    position: "absolute",
    top: 90,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT + 500,
    backgroundColor: "#FAF8FA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 10,
  },
  dragHeader: {
    height: 70,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FAF8FA",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    justifyContent: "flex-start",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0D6DC",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222222",
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContainerStyle: {
    paddingTop: 10,
    paddingBottom: 600,
  },

  /* MODE SELECTOR TABS */
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#EFE6EB",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  activeModeTab: {
    backgroundColor: "#C76C9B",
  },
  customModeIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },

  /* TYPABLE LOCATION INPUT CARD */
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DED4DA",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  inputsContainer: {
    flex: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
  },
  iconColumn: {
    width: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#555555",
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
    paddingVertical: 0,
  },
  locationDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 12,
  },
  dottedConnector: {
    width: 0,
    height: 12,
    borderWidth: 1,
    borderColor: "#C6BCC4",
    borderStyle: "dotted",
    marginLeft: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EFE6EB",
    marginLeft: 18,
  },
  swapButton: {
    padding: 8,
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  /* TICKET TYPE TOGGLE */
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DED4DA",
    padding: 3,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  activeToggleButton: {
    backgroundColor: "#C76C9B",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
  },
  activeToggleText: {
    color: "#FFFFFF",
  },

  /* TRIP DETAILS CARD */
  tripCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DED4DA",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222222",
  },

  /* SUMMARY BADGE PILL */
  summaryBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9E8F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#C76C9B",
    marginLeft: 6,
  },
  badgeDivider: {
    fontSize: 12,
    color: "#D8BFCE",
    marginHorizontal: 8,
  },
  badgeDetailText: {
    fontSize: 12,
    color: "#C76C9B",
    fontWeight: "500",
  },

  /* TIMELINE STOPS */
  timelineContainer: {
    paddingLeft: 2,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    position: "relative",
  },
  timelineIconColumn: {
    width: 24,
    alignItems: "center",
    justifyContent: "flex-start",
    marginRight: 14,
    paddingTop: 2,
  },
  solidDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D180AA",
  },
  hollowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#D180AA",
    backgroundColor: "#FFFFFF",
  },
  timelineContent: {
    flex: 1,
  },
  stopTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },
  stopSubtitle: {
    fontSize: 12,
    color: "#777777",
    marginTop: 2,
  },
  farePill: {
    backgroundColor: "#F9E8F1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fareText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#C76C9B",
  },
  verticalDottedConnector: {
    position: "absolute",
    left: 11,
    top: 22,
    bottom: -16,
    width: 0,
    borderWidth: 1,
    borderColor: "#C6BCC4",
    borderStyle: "dotted",
  },
});
