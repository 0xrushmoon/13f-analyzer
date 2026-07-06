/** SEC switched 13F value reporting from thousands to dollars on 2023-01-03. */
export const SEC_VALUE_DOLLAR_CUTOFF = "2023-01-03";

export function usesDollarValues(filedAt?: string | null): boolean {
  if (!filedAt) return false;
  const normalized = filedAt.slice(0, 10);
  return normalized >= SEC_VALUE_DOLLAR_CUTOFF;
}

export function parseSecValueUsd(
  rawValue: number,
  filedAt?: string | null
): number {
  if (rawValue <= 0) return 0;
  return usesDollarValues(filedAt) ? rawValue : rawValue * 1000;
}
