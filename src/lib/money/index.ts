/**
 * Money helpers.
 *
 * All arithmetic here works in integer minor units (cents) rather than
 * floating-point majors. `0.1 + 0.2 !== 0.3` in IEEE-754, and those errors
 * compound across a basket of line items — unacceptable when the result is
 * written to a Decimal(14,2) column and printed on a receipt.
 *
 * Convert at the boundary: `toCents` on the way in, `toMajor` on the way out.
 */

/** Rounds half away from zero, matching how receipts round rather than
 * JS's `Math.round`, which rounds half toward +Infinity (so -0.5 -> -0). */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Shifts a number's decimal point by `places` without multiplying.
 *
 * `1.005 * 100` is 100.49999999999999 in IEEE-754, so rounding it gives 100
 * instead of 101 — a real cent lost on a real receipt. Re-parsing the decimal
 * literal at a new exponent ("1.005e2") sidesteps the binary multiply.
 * Values already in exponential form fall back to multiplication; those are
 * far outside any money range where the distinction matters.
 */
function shiftDecimal(value: number, places: number): number {
  const asString = String(value);
  if (asString.includes("e") || asString.includes("E")) {
    return value * 10 ** places;
  }
  return Number(`${asString}e${places}`);
}

/** Major units (e.g. 12.34) -> integer minor units (1234). */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return roundHalfAwayFromZero(shiftDecimal(amount, 2));
}

/** Integer minor units (1234) -> major units (12.34). */
export function toMajor(cents: number): number {
  return roundHalfAwayFromZero(cents) / 100;
}

/** Applies a rate (as a percentage, e.g. 11 for 11%) to a cent amount. */
export function percentOfCents(cents: number, ratePercent: number): number {
  return roundHalfAwayFromZero((cents * ratePercent) / 100);
}

/** Distributes a cent amount across `weights` so the parts sum exactly to
 * `totalCents` — the largest-remainder method. Used to spread an
 * order-level discount over lines without losing or inventing a cent. */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  const floored = exact.map((value) => Math.floor(value));
  let remainder = totalCents - floored.reduce((sum, v) => sum + v, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  const result = [...floored];
  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] += 1;
    remainder -= 1;
  }
  return result;
}
