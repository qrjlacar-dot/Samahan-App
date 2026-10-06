import { StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
import { scale, scaleFont } from "../constants/scale";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(28),
    paddingBottom: scale(20),
    alignItems: "center"
  },
  headerContainer: {
    width: "100%",
    maxWidth: 380,
    marginBottom: scale(8)
  },
  greetingTitle: {
    fontSize: scaleFont(28),
    fontWeight: "bold",
    color: COLORS.pink,
    textShadowColor: "rgba(0, 0, 0, 0.09)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2
  },
  subTitle: {
    fontSize: scaleFont(15),
    color: COLORS.textMuted,
    marginTop: scale(2),
    textShadowColor: "rgba(0, 0, 0, 0.09)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2
  },
  mapContainer: {
    width: "100%",
    maxWidth: 380,
    flex: 1,
    borderRadius: scale(22),
    overflow: "hidden",
    position: "relative",
    marginVertical: scale(10),
    alignSelf: "center",
    backgroundColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3
  },
  mapImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(22)
  },
  locationPill: {
    position: "absolute",
    bottom: scale(18),
    left: scale(16),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: scale(16),
    paddingVertical: scale(9),
    borderRadius: scale(20),
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.12,
    shadowRadius: 4
  },
  locationDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: COLORS.pink,
    marginRight: scale(8)
  },
  locationText: {
    fontSize: scaleFont(13),
    fontWeight: "600",
    color: COLORS.textDark
  },
  emergencyCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFF0F4",
    borderRadius: scale(20),
    padding: scale(14),
    marginTop: scale(10),
    borderWidth: 1,
    borderColor: "#FEE5EC",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(10)
  },
  sirenBadge: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10)
  },
  sirenIcon: {
    width: scale(20),
    height: scale(20),
    tintColor: "#FFFFFF"
  },
  emergencyTitle: {
    fontSize: scaleFont(15),
    fontWeight: "bold",
    color: "#600000"
  },
  emergencyActionsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBg,
    borderRadius: scale(16),
    paddingVertical: scale(14),
    paddingHorizontal: scale(6)
  },
  contactButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  blueCircle: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: "#3B72EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale(8)
  },
  redCircle: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: scale(8)
  },
  hotlineText: {
    color: "#FFFFFF",
    fontSize: scaleFont(15),
    fontWeight: "bold"
  },
  buttonLabel: {
    fontSize: scaleFont(10),
    fontWeight: "500",
    color: "#555555",
    textAlign: "center",
    lineHeight: scale(13)
  },
  divider: {
    width: 1,
    height: scale(46),
    backgroundColor: "#F0F0F0",
    alignSelf: "center"
  }
});
