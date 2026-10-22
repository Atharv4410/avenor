/**
 * All money in this module is an integer number of paise (1 rupee = 100 paise).
 * Never use floating-point rupees for financial arithmetic — JS floats cannot
 * represent amounts like ₹0.10 exactly, which silently corrupts running
 * balances over many transactions. `number` is safe here (not `bigint`)
 * because JS integers are exact up to 2^53 paise (~₹90 trillion), far beyond
 * any realistic wholesale ledger.
 */
export type Paise = number;

export function rupeesToPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) throw new Error("rupeesToPaise: not a finite number");
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: Paise): number {
  return paise / 100;
}

export function formatPaiseAsINR(paise: Paise): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(paiseToRupees(paise)));
}

export function isPositiveInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n > 0;
}
