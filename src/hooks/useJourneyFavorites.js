import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { findFavorite, removeFavorite, saveFavorite } from "../services/favorites";

function routeLabel(journey) {
  const from = journey.origin?.name || "Your starting point";
  const to = journey.destination?.name || "your destination";
  return `${from} to ${to}`;
}

export function useJourneyFavorites(uid, journey) {
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const busy = useRef(false);
  const key = journey ? JSON.stringify(journey) : "";

  useEffect(() => {
    const token = ++generation.current;
    setSaved(null);
    setError("");
    setLoading(Boolean(uid && journey));
    if (uid && journey) {
      findFavorite(uid, journey).then((favorite) => {
        if (token === generation.current) setSaved({ uid, key, favorite });
      }).catch(() => {
        if (token === generation.current) setError("Could not check your saved favorites.");
      }).finally(() => {
        if (token === generation.current) setLoading(false);
      });
    }
    return () => { generation.current += 1; };
  }, [uid, key]);

  const toggle = useCallback(async () => {
    if (!uid || !journey || loading || busy.current) return;
    const token = generation.current;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const existing = await findFavorite(uid, journey);
      let favorite = null;
      if (existing) {
        await removeFavorite(uid, existing.id);
      } else {
        favorite = await saveFavorite(uid, journey);
      }
      if (token === generation.current) setSaved({ uid, key, favorite });
      Alert.alert(
        existing ? "Removed from favorites" : "Added to favorites",
        existing
          ? `${routeLabel(journey)} was removed from your favorites.`
          : `${routeLabel(journey)} was added to your favorites.`,
      );
    } catch {
      if (token === generation.current) setError("Could not update this favorite. Please try again.");
    } finally {
      busy.current = false;
      if (token === generation.current) setSaving(false);
    }
  }, [uid, journey, key, loading]);

  useEffect(() => { setSaving(false); }, [uid, key]);

  return {
    isFavorite: saved?.uid === uid && saved?.key === key && Boolean(saved.favorite),
    busy: loading || saving,
    error,
    toggle,
  };
}
