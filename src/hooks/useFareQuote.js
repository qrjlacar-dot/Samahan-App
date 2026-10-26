import { useEffect, useState } from "react";
import { quoteFare } from "../services/fares";

export function useFareQuote(route, ticketType) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setState(null);
    if (route && route.preferredMode !== "walk") {
      quoteFare(route, ticketType)
        .then((quote) => {
          if (!cancelled) setState({ route, ticketType, quote, error: "" });
        })
        .catch(() => {
          if (!cancelled)
            setState({ route, ticketType, quote: null, error: "Fare estimate unavailable." });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [route, ticketType]);
  return state?.route === route && state?.ticketType === ticketType ? state : null;
}
