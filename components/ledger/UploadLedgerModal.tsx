"use client";

import { useRef, useState } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PenLine,
  Plus,
} from "lucide-react";
import { useUIStore } from "@/lib/uiStore";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/apiClient";
import { matchCustomerName } from "@/lib/server/customerMatching";
import { useToast } from "@/components/ui/Toast";
import type { TransactionType } from "@/lib/types";

type Step = "start" | "preview" | "extracting" | "review";

type MatchState = "matched" | "new" | "ambiguous";

interface EditableRow {
  rowId: string;
  customerNameInput: string;
  customerId: string | null;
  matchState: MatchState;
  candidateIds: string[];
  type: TransactionType;
  amountRupees: number;
  description: string;
  occurredOn: string;
  needsReview?: boolean;
  reviewNote?: string | null;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "credit_sale", label: "Credit Sale" },
  { value: "payment_received", label: "Payment Received" },
];

function makeRowId() {
  return `row_${Math.random().toString(36).slice(2)}`;
}

export default function UploadLedgerModal() {
  const isOpen = useUIStore((s) => s.isUploadModalOpen);
  const close = useUIStore((s) => s.closeUploadModal);
  const customers = useAppStore((s) => s.customers);
  const configStatus = useAppStore((s) => s.configStatus);
  const refreshCustomers = useAppStore((s) => s.refreshCustomers);
  const refreshTransactions = useAppStore((s) => s.refreshTransactions);
  const refreshActivity = useAppStore((s) => s.refreshActivity);
  const toast = useToast();

  const [step, setStep] = useState<Step>("start");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ledgerDocumentId, setLedgerDocumentId] = useState<string | null>(null);
  const [notConfiguredMessage, setNotConfiguredMessage] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pageNote, setPageNote] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function reset() {
    setStep("start");
    setPreviewUrl(null);
    setFile(null);
    setLedgerDocumentId(null);
    setNotConfiguredMessage(null);
    setExtractError(null);
    setPageNote(null);
    setRows([]);
    setIsConfirming(false);
  }

  function handleClose() {
    reset();
    close();
  }

  function customerRecords() {
    return customers.map((c) => ({ id: c.id, name: c.name, shopName: c.shopName }));
  }

  function buildRowFromMatch(name: string): Pick<EditableRow, "customerId" | "matchState" | "candidateIds"> {
    const match = matchCustomerName(name, customerRecords());
    if (match.kind === "exact" || match.kind === "single") {
      return { customerId: match.customerId, matchState: "matched", candidateIds: [] };
    }
    if (match.kind === "ambiguous") {
      return { customerId: null, matchState: "ambiguous", candidateIds: match.candidateIds };
    }
    return { customerId: null, matchState: "new", candidateIds: [] };
  }

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setStep("preview");
  }

  function handleManualEntry() {
    setRows([
      {
        rowId: makeRowId(),
        customerNameInput: "",
        customerId: null,
        matchState: "new",
        candidateIds: [],
        type: "credit_sale",
        amountRupees: 0,
        description: "",
        occurredOn: new Date().toISOString().slice(0, 10),
      },
    ]);
    setStep("review");
  }

  async function handleUploadAndExtract() {
    if (!file) return;
    setStep("extracting");
    try {
      const uploadResult = await api.ledger.upload(file);
      const docId = uploadResult.ledgerDocument.id;
      setLedgerDocumentId(docId);

      const extraction = await api.ledger.extract(docId);
      if (!extraction.configured) {
        setNotConfiguredMessage(extraction.message ?? "AI extraction is not configured.");
        setRows([]);
        setStep("review");
        return;
      }

      setPageNote(extraction.pageNote ?? null);
      const built: EditableRow[] = (extraction.rows ?? []).map((r) => {
        const matchInfo =
          r.match.kind === "ambiguous"
            ? { customerId: null, matchState: "ambiguous" as const, candidateIds: r.match.candidateIds }
            : r.match.kind === "none"
              ? { customerId: null, matchState: "new" as const, candidateIds: [] }
              : { customerId: r.match.customerId, matchState: "matched" as const, candidateIds: [] };
        return {
          rowId: makeRowId(),
          customerNameInput: r.customerNameRaw,
          ...matchInfo,
          type: r.transactionType,
          amountRupees: r.amountRupees ?? 0,
          description: r.description,
          occurredOn: r.occurredOn ?? new Date().toISOString().slice(0, 10),
          needsReview: r.needsReview,
          reviewNote: r.reviewNote,
        };
      });
      setRows(built);
      setStep("review");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed.");
      setStep("preview");
    }
  }

  function updateRow(rowId: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function handleCustomerNameChange(rowId: string, name: string) {
    const matchInfo = buildRowFromMatch(name);
    updateRow(rowId, { customerNameInput: name, ...matchInfo });
  }

  function resolveAmbiguous(rowId: string, customerId: string) {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    updateRow(rowId, {
      customerId: c.id,
      customerNameInput: c.shopName,
      matchState: "matched",
      candidateIds: [],
    });
  }

  function addManualRow() {
    setRows((prev) => [
      ...prev,
      {
        rowId: makeRowId(),
        customerNameInput: "",
        customerId: null,
        matchState: "new",
        candidateIds: [],
        type: "credit_sale",
        amountRupees: 0,
        description: "",
        occurredOn: new Date().toISOString().slice(0, 10),
      },
    ]);
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  const hasBlockingIssues = rows.some(
    (r) =>
      r.matchState === "ambiguous" ||
      !r.amountRupees ||
      r.amountRupees <= 0 ||
      !r.customerNameInput.trim()
  );

  async function handleConfirm() {
    if (rows.length === 0 || hasBlockingIssues || isConfirming) return;
    setIsConfirming(true);
    try {
      const result = await api.ledger.confirm({
        ledgerDocumentId,
        batchId: ledgerDocumentId ?? `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        rows: rows.map((r) => ({
          customerId: r.customerId,
          newCustomerName: r.matchState === "new" ? r.customerNameInput.trim() : null,
          type: r.type,
          amountRupees: r.amountRupees,
          description: r.description,
          occurredOn: r.occurredOn,
        })),
      });
      await Promise.all([refreshCustomers(), refreshTransactions(), refreshActivity()]);
      toast.show(
        `${result.insertedCount} transaction${result.insertedCount === 1 ? "" : "s"} saved — balances updated.${
          result.duplicateCount > 0 ? ` (${result.duplicateCount} duplicate row(s) skipped.)` : ""
        }`,
        "success"
      );
      handleClose();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not save transactions.", "error");
    } finally {
      setIsConfirming(false);
    }
  }

  const aiNotConfigured = configStatus && !configStatus.aiExtraction;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/30 p-4 animate-fade-in">
      <div className="card flex max-h-[90vh] w-full max-w-3xl animate-scale-in flex-col overflow-hidden shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Upload Ledger</h2>
            <p className="text-xs text-ink-muted">
              Photograph a ledger page or receipt, then review before saving.
            </p>
          </div>
          <button onClick={handleClose} className="text-ink-faint transition-colors hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "start" && (
            <div className="space-y-4">
              {aiNotConfigured && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                  <AlertTriangle size={14} className="shrink-0" />
                  AI extraction is not configured on this deployment — you can still upload for your
                  records, or enter transactions manually below.
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-paper/60 px-6 py-10 text-center transition-colors hover:border-accent-300 hover:bg-accent-50/40"
              >
                <UploadCloud className="text-ink-faint" size={28} />
                <p className="text-sm font-medium text-ink">Click to upload a photo</p>
                <p className="text-xs text-ink-faint">JPG, PNG, or WEBP, up to 10MB</p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-xs text-ink-faint">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <button onClick={handleManualEntry} className="btn-secondary w-full">
                <PenLine size={16} />
                Enter transactions manually
              </button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center rounded-xl border border-line bg-paper/60 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl ?? ""}
                  alt="Uploaded ledger preview"
                  className="max-h-72 rounded-lg object-contain"
                />
              </div>
              {extractError && (
                <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-600">
                  <AlertTriangle size={14} className="shrink-0" />
                  {extractError} You can retry, or enter the transactions manually.
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={reset}>
                  Back
                </button>
                <button className="btn-secondary" onClick={handleManualEntry}>
                  <PenLine size={16} />
                  Enter manually instead
                </button>
                <button className="btn-primary" onClick={handleUploadAndExtract}>
                  <Sparkles size={16} />
                  Extract Transactions
                </button>
              </div>
            </div>
          )}

          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="animate-spin text-accent-600" size={28} />
              <p className="text-sm text-ink-muted">Reading the ledger page…</p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4">
              {notConfiguredMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-600">
                  <AlertTriangle size={14} className="shrink-0" />
                  {notConfiguredMessage}
                </div>
              )}
              {pageNote && (
                <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-xs text-ink-muted">
                  {pageNote}
                </div>
              )}

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
                            value={r.customerNameInput}
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
                          {r.needsReview && (
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                              <AlertTriangle size={11} /> {r.reviewNote ?? "Needs review"}
                            </p>
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
                            value={r.amountRupees || ""}
                            onChange={(e) =>
                              updateRow(r.rowId, { amountRupees: Number(e.target.value) || 0 })
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
                            value={r.occurredOn}
                            onChange={(e) => updateRow(r.rowId, { occurredOn: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeRow(r.rowId)}
                            className="text-ink-faint transition-colors hover:text-danger-600"
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

              <button onClick={addManualRow} className="btn-ghost !px-2.5 text-xs">
                <Plus size={14} /> Add row
              </button>

              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>{rows.length} transaction(s) ready for review</span>
                <span className="font-medium text-ink">
                  Total: ₹{rows.reduce((sum, r) => sum + (r.amountRupees || 0), 0).toLocaleString("en-IN")}
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
                  Every row needs a customer, amount, and resolved match before saving
                </span>
              )}
              <button
                className="btn-primary"
                disabled={hasBlockingIssues || rows.length === 0 || isConfirming}
                onClick={handleConfirm}
              >
                {isConfirming ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Confirm &amp; Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
