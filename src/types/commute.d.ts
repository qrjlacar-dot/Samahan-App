export type TravelMode = "bus" | "jeep" | "train" | "walk";

export type TicketType = "regular" | "discounted";

export type NotificationCategory =
  | "trips"
  | "safety"
  | "favorites";

export type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "denied"
  | "unavailable"
  | "outside-area";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Position extends Coordinate {
  accuracyMeters: number | null;
  headingDegrees: number | null;
  timestamp: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  coordinate: Coordinate;
  source: "google" | "verified-local" | "device";
}

export interface RouteRequest {
  origin: Place;
  destination: Place;
  preferredMode: TravelMode;
  departureTime?: string;
}

export interface RouteStep {
  id: string;
  mode: TravelMode;
  instruction: string;
  start: Coordinate;
  end: Coordinate;
  polyline: Coordinate[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  lineName: string | null;
  boardingStop: string | null;
  alightingStop: string | null;
  stopCount: number | null;
  operatorId: string | null;
}

export interface CommuteRoute {
  id: string;
  origin: Place;
  destination: Place;
  preferredMode: TravelMode;
  actualModes: TravelMode[];
  distanceMeters: number | null;
  durationSeconds: number | null;
  polyline: Coordinate[];
  steps: RouteStep[];
  source: "google" | "verified-local";
  calculatedAt: string;
  warnings: string[];
}

export interface FareItem {
  stepId: string;
  regular: number | null;
  discounted: number | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  note: string;
}

export interface FareQuote {
  currency: "PHP";
  ticketType: TicketType;
  regularTotal: number | null;
  discountedTotal: number | null;
  selectedTotal: number | null;
  complete: boolean;
  items: FareItem[];
  note: string;
}

export interface LocationSnapshot {
  status: LocationStatus;
  position: Position | null;
  label: string;
  inServiceArea: boolean | null;
}

export interface LocationHandle {
  remove(): void;
}

export interface FavoriteInput {
  origin: Place;
  destination: Place;
  preferredMode: TravelMode;
  ticketType: TicketType;
}

export interface SavedFavorite extends FavoriteInput {
  id: string;
  createdAt: string;
}

export type NotificationTarget =
  | {
      screen: "favorites";
    }
  | {
      screen: "directions";
      journey: FavoriteInput;
    };

export interface NotificationInput {
  eventId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  target: NotificationTarget | null;
}

export interface AppNotification extends NotificationInput {
  id: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPreferences {
  enabled: boolean;
}

export interface NavigationProgress {
  status: "idle" | "active" | "paused" | "arrived" | "off-route";
  currentStepIndex: number | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  lastPositionAt: string | null;
}