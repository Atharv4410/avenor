"use client";

import { useRef, useState } from "react";
import {
  X,
  UploadCloud,
  FileImage,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useUIStore } from "@/lib/uiStore";
import { useAppStore } from "@/lib/store";
import { matchCustomer, formatINR, makeId } from "@/lib/utils";
import { MOCK_EXTRACTED_ROWS } from "@/lib/mockExtraction";
import { useToast } from "@/components/ui/Toast";
import type { NewTransactionDraft, TransactionType } from "@/lib/types";
import { cn } from "@/lib/cn";

type Step = "start" | "preview" | "extracting" | "review";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "credit_sale", label: "Credit Sale" },
  { value: "payment_received", label: "Payment Received" },
];

export default function UploadLedgerModal() {
  const isOpen = useUIStore((s) => s.isUploadModalOpen);
  const close = useUIStore((s) => s.closeUploadModal);
  const customers = useAppStore((s) => s.customers);
  const addConfirmedTransactions = useAppStore((s) => s.addConfirmedTransactions);
  const toast = useToast();

  const [step, setStep] = useState<Step>("start");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [rows, setRows] = useState<NewTransactionDraft[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function reset() {
    setStep("start");
    setPreviewUrl(null);
    setIsDemo(false);
    setRows([]);
    setIsConfirming(false);
  }

  function handleClose() {
    reset();
    close();
  }

  function handleFileSelected(file: File) {
    setIsDemo(false);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("preview");
  }

  function handleTryDemo() {
    setIsDemo(true);
    setPreviewUrl(null);
    setStep("preview");
  }

  function runExtraction() {
    setStep("extracting");
    setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      const built: NewTransactionDraft[] = MOCK_EXTRACTED_ROWS.map((raw) => {
        const match = matchCustomer(raw.customerName, customers);
        const base = {
          rowId: makeId("row"),
          customerName: raw.customerName,
          description: raw.description,
          amount: raw.amount,
          type: raw.type,
          date: today,
        };
        if (match.kind === "exact" || match.kind === "single") {
          return {
            ...base,
            customerId: match.customer.id,
            matchState: "matched" as const,
            candidateIds: [],
          };
        }
        if (match.kind === "ambiguous") {
          return {
            ...base,
            customerId: null,
            matchState: "ambiguous" as const,
            candidateIds: match.candidates.map((c) => c.id),
          };
        }
        return {
          ...base,
          customerId: null,
          matchState: "new" as const,
          candidateIds: [],
        };
      });
      setRows(built);
      setStep("review");
    }, 1400);
  }

  function updateRow(rowId: string, patch: Partial<NewTransactionDraft>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function handleCustomerNameChange(rowId: string, name: string) {
    const match = matchCustomer(name, customers);
    if (match.kind === "exact" || match.kind === "single") {
      updateRow(rowId, {
        customerName: name,
        customerId: match.customer.id,
        matchState: "matched",
        candidateIds: [],
      });
    } else if (match.kind === "ambiguous") {
      updateRow(rowId, {
        customerName: name,
        customerId: null,
        matchState: "ambiguous",
        candidateIds: match.candidates.map((c) => c.id),
      });
    } else {
      updateRow(rowId, { customerName: name, customerId: null, matchState: "new", candidateIds: [] });
    }
  }

  function resolveAmbiguous(rowId: string, customerId: string) {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    updateRow(rowId, {
      customerId: c.id,
      customerName: c.shopName,
      matchState: "matched",
      candidateIds: [],
    });
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  const hasBlockingIssues = rows.some(
    (r) => r.matchState === "ambiguous" || r.amount <= 0 || !r.customerName.trim()
  );

  function handleConfirm() {
    if (rows.length === 0 || hasBlockingIssues || isConfirming) return;
    setIsConfirming(true);
    addConfirmedTransactions(
      rows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName,
        description: r.description,
        amount: r.amount,
        type: r.type,
      }))
    );
    toast.show(
      `${rows.length} transaction${rows.length === 1 ? "" : "s"} saved — balances and dashboard updated.`,
      "success"
    );
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/30 p-4">
      <div className="card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Upload Ledger</h2>
            <p className="text-xs text-ink-muted">
              Photograph a ledger page or receipt, then review before saving.
            </p>
          </div>
          <button onClick={handleClose} className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "start" && (
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper/60 px-6 py-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <UploadCloud className="text-ink-faint" size={28} />
                <p className="text-sm font-medium text-ink">Click to upload a photo</p>
                <p className="text-xs text-ink-faint">JPG or PNG of a ledger page or receipt</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-faint">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <button onClick={handleTryDemo} className="btn-secondary w-full">
                <Sparkles size={16} />
                Try demo ledger
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-xl border border-line bg-paper/60 p-4">
                {isDemo ? (
                  <div className="flex h-56 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white text-center">
                    <FileImage className="text-ink-faint" size={28} />
                    <p className="px-6 text-xs text-ink-muted">
                      Sample ledger page — Shree Balaji Spices &amp; Dry Fruits
                    </p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl ?? ""}
                    alt="Uploaded ledger preview"
                    className="max-h-72 rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                <AlertTriangle size={14} className="shrink-0" />
                Prototype extraction: this demo does not run real OCR on the image. Clicking
                &ldquo;Extract Transactions&rdquo; populates editable sample data for review.
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={reset}>
                  Back
                </button>
                <button className="btn-primary" onClick={runExtraction}>
                  <Sparkles size={16} />
                  Extract Transactions
                </button>
              </div>
            </div>
          )}

          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="animate-spin text-brand-600" size={28} />
              <p className="text-sm text-ink-muted">Reading the ledger page…</p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                <AlertTriangle size={14} className="shrink-0" />
                Prototype extraction — sample data shown for review, not read from your image.
                Correct anything before saving.
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Amount (₹)</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.rowId} className="align-top">
                        <td className="px-3 py-2">
                          <input
                            className="input"
                            value={r.customerName}
                            onChange={(e) => handleCustomerNameChange(r.rowId, e.target.value)}
                          />
                          {r.matchState === "matched" && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-brand-600">
                              <CheckCircle2 size={11} /> Matched existing customer
                            </p>
                          )}
                          {r.matchState === "new" && (
                            <p className="mt-1 text-[11px] text-ink-faint">Will add as new customer</p>
                          )}
                          {r.matchState === "ambiguous" && (
                            <div className="mt-1 space-y-1">
                              <p className="flex items-center gap-1 text-[11px] text-amber-600">
                                <AlertTriangle size={11} /> Ambiguous — pick one
                              </p>
                              <select
                                className="input py-1 text-xs"
                                defaultValue=""
                                onChange={(e) => resolveAmbiguous(r.rowId, e.target.value)}
                              >
                                <option value="" disabled>
                                  Select customer…
                                </option>
                                {r.candidateIds.map((id) => {
                                  const c = customers.find((x) => x.id === id);
                                  return c ? (
                                    <option key={id} value={id}>
                                      {c.shopName} ({c.name})
                                    </option>
                                  ) : null;
                                })}
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input"
                            value={r.description}
                            onChange={(e) => updateRow(r.rowId, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            className="input w-28"
                            value={r.amount}
                            onChange={(e) =>
                              updateRow(r.rowId, { amount: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input"
                            value={r.type}
                            onChange={(e) =>
                              updateRow(r.rowId, { type: e.target.value as TransactionType })
                            }
                          >
                            {TYPE_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            className="input"
                            value={r.date}
                            onChange={(e) => updateRow(r.rowId, { date: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeRow(r.rowId)}
                            className="text-ink-faint hover:text-danger-600"
                            aria-label="Remove row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>{rows.length} transaction(s) ready for review</span>
                <span className="font-medium text-ink">
                  Total: {formatINR(rows.reduce((sum, r) => sum + r.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {step === "review" && (
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <button className="btn-secondary" onClick={reset}>
              Start over
            </button>
            <div className="flex items-center gap-2">
              {hasBlockingIssues && (
                <span className="text-xs text-danger-600">
                  Resolve ambiguous rows before saving
                </span>
              )}
              <button
                className="btn-primary"
                disabled={hasBlockingIssues || rows.length === 0 || isConfirming}
                onClick={handleConfirm}
              >
                <CheckCircle2 size={16} />
                Confirm &amp; Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
