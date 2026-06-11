/** Compact unique-enough id for rounds and players (local-only app). */
export function newId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}
