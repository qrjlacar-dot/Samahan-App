export const normalizePlaceText = (text) =>
  String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function placeMatchScore(name, query) {
  const a = normalizePlaceText(name),
    b = normalizePlaceText(query);
  if (!b) return 9;
  if (a === b) return 0;
  if (a.startsWith(b)) return 1;
  if (b.split(" ").every((word) => a.split(" ").some((part) => part.startsWith(word)))) return 2;
  return a.includes(b) ? 3 : 9;
}
