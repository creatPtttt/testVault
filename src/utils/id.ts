/**
 * Tiny id helper for delvers / items created at runtime.
 */

/** Create a reasonably unique client-side id string */
export function createId(prefix: string): string {
  // Combine prefix, time, and random entropy for collision resistance
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
