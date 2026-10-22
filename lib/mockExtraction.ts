import type { TransactionType } from "./types";

export interface RawExtractedRow {
  customerName: string;
  description: string;
  amount: number;
  type: TransactionType;
}

/**
 * Hardcoded stand-in for an OCR + LLM extraction pass over a photographed
 * ledger page. No image is actually read — see the "Prototype extraction"
 * notice shown in the upload modal. The rows are deliberately varied:
 * an exact match, a partial match, an ambiguous name, and a brand-new
 * customer, so the review table's matching logic has something real to show.
 */
export const MOCK_EXTRACTED_ROWS: RawExtractedRow[] = [
  {
    customerName: "Rajesh",
    description: "Cardamom 5kg, Cashew 2kg",
    amount: 3200,
    type: "credit_sale",
  },
  {
    customerName: "Sharma Stores",
    description: "Partial payment received",
    amount: 5000,
    type: "payment_received",
  },
  {
    customerName: "Krishna",
    description: "Mixed spices order",
    amount: 4500,
    type: "credit_sale",
  },
  {
    customerName: "Deepak General Store",
    description: "Cash counter sale",
    amount: 2200,
    type: "cash_sale",
  },
  {
    customerName: "Lakshmi Kirana Store",
    description: "Dry fruits bulk order, 10kg almonds",
    amount: 6000,
    type: "credit_sale",
  },
  {
    customerName: "Modern Bazaar",
    description: "Payment via UPI",
    amount: 3000,
    type: "payment_received",
  },
];
