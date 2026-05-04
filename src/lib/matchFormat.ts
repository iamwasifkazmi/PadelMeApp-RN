/**
 * Doubles-style rules: 2v2 lobby, lock line-ups before start, min 4 players.
 * Treats maxPlayers >= 4 as doubles unless explicitly a 1v1 singles match (≤2 slots).
 */
export function isDoublesFormat(m: { matchType?: string | null; maxPlayers: number }): boolean {
  const mt = (m.matchType || "singles").toLowerCase();
  if (mt === "singles" && m.maxPlayers <= 2) return false;
  return mt === "doubles" || mt === "mixed_doubles" || m.maxPlayers >= 4;
}
