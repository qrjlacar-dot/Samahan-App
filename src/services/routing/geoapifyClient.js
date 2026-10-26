import { routeError } from "../commuteErrors";

const API_BASE = "https://api.geoapify.com/v1";

// Share API-key checks, timeout handling and cancellation across Geoapify requests.
export async function requestGeoapify(path, params, signal, version = "v1") {
  const apiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY?.trim();

  if (!apiKey || apiKey === "PASTE_YOUR_GEOAPIFY_KEY_HERE") {
    throw routeError(
      "missing-api-key",
      "Add EXPO_PUBLIC_GEOAPIFY_API_KEY to .env.local, then restart Expo.",
    );
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  if (signal?.aborted) controller.abort();

  signal?.addEventListener("abort", abort);

  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);

  const query = Object.entries({ ...params, apiKey })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  try {
    const response = await fetch(`${API_BASE.replace(/v1$/, version)}/${path}?${query}`, {
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw routeError(
        "api-key-rejected",
        "Geoapify rejected the request. Check your API key and its restrictions in MyProjects.",
      );
    }

    if (response.status === 429) {
      throw routeError(
        "rate-limit",
        "Geoapify's usage limit was reached. Wait before trying again and check your project usage.",
      );
    }

    if (!response.ok) {
      throw routeError(
        "provider-error",
        "Geoapify could not complete this request. Try another nearby place or try again later.",
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.features)) {
      throw routeError(
        "invalid-response",
        "Geoapify returned an unexpected result. Please try again.",
      );
    }

    return data;
  } catch (error) {
    if (signal?.aborted) {
      throw Object.assign(new Error("Request cancelled."), { name: "AbortError" });
    }

    if (timedOut) {
      throw routeError(
        "timeout",
        "The request took too long. Check your internet connection and try again.",
      );
    }

    if (error.code?.startsWith("commute/") || error.name === "AbortError") {
      throw error;
    }

    throw routeError(
      "network",
      "Could not connect to Geoapify. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
