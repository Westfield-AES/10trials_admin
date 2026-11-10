"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdminAuth } from "@/components/providers";
import { FeedbackBanner, Modal } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import { requestErrorMessage } from "@/lib/user-errors";

type UsagePeriod = "lifetime" | "monthly";

export function ResetUsageButton({
  userId,
  userLabel,
  usagePeriod,
  onSuccess,
}: {
  userId: string;
  userLabel: string;
  usagePeriod: UsagePeriod;
  onSuccess: (message: string) => void;
}) {
  const { admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  if (!admin?.permissions.includes("users.usage.adjust")) return null;

  async function resetUsage() {
    if (submitting.current || reason.trim().length < 3) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ usage_period: UsagePeriod }>(
        `/api/v1/admin/users/${userId}/usage-reset`,
        { method: "POST", body: JSON.stringify({ reason: reason.trim() }) },
      );
      setOpen(false);
      onSuccess(
        result.usage_period === "lifetime"
          ? `Usage reset for ${userLabel}. The full one-time free allowance is available again.`
          : `Usage reset for ${userLabel}. The full allowance for this month is available again.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user", userId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] }),
      ]);
    } catch (nextError) {
      setError(requestErrorMessage(nextError));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="button-secondary whitespace-nowrap"
        aria-label={`Reset usage for ${userLabel}`}
        onClick={() => { setReason(""); setError(null); setOpen(true); }}
      >
        <RotateCcw size={16} /> Reset usage
      </button>
      {open && createPortal(
        <Modal open title="Reset user usage" onClose={() => { if (!submitting.current) setOpen(false); }}>
          <form onSubmit={(event) => { event.preventDefault(); void resetUsage(); }}>
            <p className="break-words text-sm font-black text-[#032e4d]">{userLabel}</p>
            <p className="mt-3 text-sm leading-6 text-[#607282]">
              {usagePeriod === "lifetime"
                ? "Reset sessions and questions used to zero and restore this user's full one-time free allowance."
                : "Reset sessions and questions used this month to zero and restore this user's full monthly allowance."}
              {" "}Session history and subscription details will be kept.
            </p>
            {error && <FeedbackBanner message={error} tone="error" />}
            <label className="mt-4 block">
              <span className="field-label">Reason</span>
              <textarea
                className="field min-h-24"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Required for the audit log"
                minLength={3}
                maxLength={500}
                required
                disabled={busy}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="button-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="button-primary" disabled={busy || reason.trim().length < 3}>
                {busy ? "Resetting…" : "Reset usage"}
              </button>
            </div>
          </form>
        </Modal>,
        document.body,
      )}
    </>
  );
}
