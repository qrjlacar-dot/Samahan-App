export function featureNotReady(feature) {
  const error = new Error(`${feature} has not been implemented yet.`);

  error.code = "commute/not-implemented";

  return error;
}

// Give route failures a stable code that screens and planners can recognize.
export function routeError(code, message) {
  return Object.assign(new Error(message), { code: `commute/${code}` });
}
