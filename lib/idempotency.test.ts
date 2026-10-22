import { describe, it, expect } from "vitest";
import { transactionIdempotencyKey, sendAttemptIdempotencyKey, hashString } from "./idempotency";

describe("idempotency keys", () => {
  it("produces the same key for the same transaction row every time", () => {
    const params = {
      ledgerDocumentId: "doc-1",
      rowIndex: 0,
      amountPaise: 320000,
      type: "credit_sale",
      occurredOn: "2026-10-22",
    };
    expect(transactionIdempotencyKey(params)).toBe(transactionIdempotencyKey(params));
  });

  it("produces different keys for different rows of the same document", () => {
    const base = {
      ledgerDocumentId: "doc-1",
      amountPaise: 320000,
      type: "credit_sale",
      occurredOn: "2026-10-22",
    };
    const keyRow0 = transactionIdempotencyKey({ ...base, rowIndex: 0 });
    const keyRow1 = transactionIdempotencyKey({ ...base, rowIndex: 1 });
    expect(keyRow0).not.toBe(keyRow1);
  });

  it("send-attempt keys are scoped per reminder and nonce", () => {
    const a = sendAttemptIdempotencyKey("rem-1", "nonce-a");
    const b = sendAttemptIdempotencyKey("rem-1", "nonce-b");
    const c = sendAttemptIdempotencyKey("rem-2", "nonce-a");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("hashString is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
    expect(hashString("hello")).not.toBe(hashString("world"));
  });
});
