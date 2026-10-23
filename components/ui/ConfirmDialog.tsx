"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-ink/30 px-4">
      <div className="card w-full max-w-md animate-scale-in p-6 shadow-pop">
        <div className="flex items-start gap-3">
          {tone === "danger" && (
            <div className="shrink-0 rounded-full bg-danger-50 p-2 text-danger-600">
              <AlertTriangle size={18} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <div className="mt-1.5 text-sm text-ink-muted">{description}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
