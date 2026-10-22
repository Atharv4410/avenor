export interface CustomerNameRecord {
  id: string;
  name: string;
  shopName: string;
}

export type CustomerMatchResult =
  | { kind: "exact"; customerId: string }
  | { kind: "single"; customerId: string }
  | { kind: "ambiguous"; candidateIds: string[] }
  | { kind: "none" };

/**
 * Loose, case-insensitive containment match between a raw transcribed name
 * and the business's existing customers. Deliberately conservative: more
 * than one plausible match is reported as "ambiguous" rather than guessed,
 * per the product rule that an ambiguous customer match must be flagged for
 * human review rather than silently resolved.
 */
export function matchCustomerName(
  rawName: string,
  customers: CustomerNameRecord[]
): CustomerMatchResult {
  const needle = rawName.trim().toLowerCase();
  if (!needle) return { kind: "none" };

  const exact = customers.find(
    (c) => c.name.toLowerCase() === needle || c.shopName.toLowerCase() === needle
  );
  if (exact) return { kind: "exact", customerId: exact.id };

  const partial = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      needle.includes(c.name.toLowerCase()) ||
      c.shopName.toLowerCase().includes(needle) ||
      needle.includes(c.shopName.toLowerCase())
  );

  if (partial.length === 1) return { kind: "single", customerId: partial[0].id };
  if (partial.length > 1) return { kind: "ambiguous", candidateIds: partial.map((c) => c.id) };
  return { kind: "none" };
}
