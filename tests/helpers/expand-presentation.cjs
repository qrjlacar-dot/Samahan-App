const PRESENTATIONAL_COMPONENTS = new Set([
  "TripActionButton",
  "TripControlCard",
  "WalkingBusTripControls",
  "GuidedTripControls",
  "OptionToggle",
]);

// Expand only hook-free presentation components when checking rendered controls.
module.exports = function expandPresentation(tree) {
  if (Array.isArray(tree)) return tree.map(expandPresentation);
  if (!tree || typeof tree !== "object") return tree;
  if (typeof tree.type === "function" && PRESENTATIONAL_COMPONENTS.has(tree.type.name)) {
    return expandPresentation(tree.type(tree.props));
  }
  return { ...tree, props: { ...tree.props, children: expandPresentation(tree.props?.children) } };
};
