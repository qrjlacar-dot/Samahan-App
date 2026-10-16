export function featureNotReady(feature) {
  const error = new Error(
    `${feature} has not been implemented yet.`,
  );

  error.code = "commute/not-implemented";

  return error;
}