export const CHART_COLORS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#7c3aed",
  "#be123c",
  "#15803d",
  "#c2410c",
  "#1d4ed8",
  "#a16207",
  "#475569",
];

export function truncateName(name: string, max = 18): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}
