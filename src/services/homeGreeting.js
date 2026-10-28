export function getHomeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Magandang Umaga!";
  if (hour >= 12 && hour < 13) return "Magandang Tanghali!";
  if (hour >= 13 && hour < 18) return "Magandang Hapon!";
  return "Magandang Gabi!";
}
