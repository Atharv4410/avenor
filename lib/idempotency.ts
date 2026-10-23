import { createHash } from "crypto";

/** Stable content hash used as an idempotency key — e.g. for a ledger image
 * upload, so retrying a flaky network request doesn't create a duplicate
 * document/extraction job for the same bytes. */
export function hashBuffer(buf: Buffer | Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function hashString(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Deterministic per-row idempotency key for a confirmed ledger transaction,
 * so retrying "Confirm & Save" (e.g. a double click, or a client retry after
 * a timeout) cannot insert the same row twice. Stable for the same
 * (document, row index, amount, type, date) tuple. */
export function transactionIdempotencyKey(params: {
  ledgerDocumentId: string;
  rowIndex: number;
  amountPaise: number;
  type: string;
  occurredOn: string;
}): string {
  return hashString(
    `txn:${params.ledgerDocumentId}:${params.rowIndex}:${params.type}:${params.amountPaise}:${params.occurredOn}`
  );
}

/** Idempotency key for a reminder send attempt, scoped to the reminder and a
 * client-supplied nonce (so the UI can safely retry a failed network call
 * without double-sending through the WhatsApp provider). */
export function sendAttemptIdempotencyKey(reminderId: string, nonce: string): string {
  return hashString(`send:${reminderId}:${nonce}`);
}

/** Same idea as sendAttemptIdempotencyKey, for sending a customer-reply draft. */
export function replySendIdempotencyKey(customerReplyId: string, nonce: string): string {
  return hashString(`reply_send:${customerReplyId}:${nonce}`);
}
