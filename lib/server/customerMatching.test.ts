import { describe, it, expect } from "vitest";
import { matchCustomerName } from "./customerMatching";

const customers = [
  { id: "1", name: "Rajesh Kumar", shopName: "Rajesh Traders" },
  { id: "2", name: "Krishnan Nair", shopName: "New Krishna Traders" },
  { id: "3", name: "Krishna Moorthy", shopName: "Krishna Enterprises" },
  { id: "4", name: "Suresh Sharma", shopName: "Sharma Stores" },
];

describe("matchCustomerName", () => {
  it("finds an exact match on shop name", () => {
    expect(matchCustomerName("Sharma Stores", customers)).toEqual({ kind: "exact", customerId: "4" });
  });

  it("finds a single partial match", () => {
    expect(matchCustomerName("Rajesh", customers)).toEqual({ kind: "single", customerId: "1" });
  });

  it("flags ambiguous matches instead of guessing", () => {
    const result = matchCustomerName("Krishna", customers);
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.candidateIds.sort()).toEqual(["2", "3"]);
    }
  });

  it("reports no match for an unseen name", () => {
    expect(matchCustomerName("Totally New Shop", customers)).toEqual({ kind: "none" });
  });

  it("treats an empty name as no match", () => {
    expect(matchCustomerName("   ", customers)).toEqual({ kind: "none" });
  });
});
