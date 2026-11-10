"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, Gauge, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminAuth } from "@/components/providers";
import {
  ErrorPanel,
  FeedbackBanner,
  MetricCard,
  Modal,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { UserDetail } from "@/lib/types";
import { requestErrorMessage } from "@/lib/user-errors";
import { formatDate, formatMinorAmount, formatPercent, titleCase } from "@/lib/utils";

type Action = "usage" | "delete" | "restore" | null;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { admin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [sessionDelta, setSessionDelta] = useState(0);
  const [questionDelta, setQuestionDelta] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const detail = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => apiRequest<UserDetail>(`/api/v1/admin/users/${id}`),
  });
  const data = detail.data;

  async function submitAction() {
    if (!action) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (action === "usage") {
        await apiRequest(`/api/v1/admin/users/${id}/usage-adjustments`, {
          method: "POST",
          body: JSON.stringify({ session_delta: sessionDelta, question_delta: questionDelta, reason }),
        });
        setFeedback({ message: "Usage adjustment saved.", tone: "success" });
      } else {
        await apiRequest(`/api/v1/admin/users/${id}/${action === "delete" ? "soft-delete" : "restore"}`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        setFeedback({
          message: action === "delete" ? "User access removed. The account can still be restored." : "User access restored.",
          tone: "success",
        });
      }
      setAction(null);
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (nextError) {
      setFeedback({ message: requestErrorMessage(nextError), tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <Link href="/users" className="inline-flex items-center gap-2 text-sm font-black text-[#607282] hover:text-[#032e4d]"><ArrowLeft size={17} /> Back to users</Link>
      {detail.isLoading ? (
        <div className="grid min-h-[60vh] place-items-center"><Spinner label="Loading user record" /></div>
      ) : detail.isError || !data ? (
        <div className="mt-6"><ErrorPanel error={detail.error} onRetry={() => detail.refetch()} /></div>
      ) : (
        <>
          <div className="mt-5">
            <PageHeader
              eyebrow="User record"
              title={data.user.display_name || "Unnamed user"}
              description={data.user.email || "No email address recorded"}
              action={
                <div className="flex flex-wrap gap-2">
                  {admin?.permissions.includes("users.usage.adjust") && <button className="button-secondary" onClick={() => setAction("usage")}><Gauge size={16} /> Adjust usage</button>}
                  {data.user.status === "soft_deleted" && admin?.permissions.includes("users.account.restore") && <button className="button-primary" onClick={() => setAction("restore")}><RotateCcw size={16} /> Restore</button>}
                  {data.user.status === "active" && admin?.permissions.includes("users.account.delete") && <button className="button-danger" onClick={() => setAction("delete")}><Trash2 size={16} /> Remove access</button>}
                </div>
              }
            />
          </div>
          {feedback && <FeedbackBanner {...feedback} />}
          <section className="panel mt-6 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-[#c94d00]">Practice journey</p>
            <h2 className="mt-2 text-xl font-black text-[#032e4d]">{({ start_free: "Ready for first free practice", free_practice: "Using one-time free practice", upgrade_required: "Free allowance used · upgrade available", pro_practice: "Pro practice active", monthly_limit_reached: "Monthly Pro allowance used" } as Record<string, string>)[data.journey.phase] || data.journey.phase}</h2>
            <p className="mt-3 text-sm text-[#607282]">{data.journey.sessions_remaining} sessions and {data.journey.questions_remaining} questions remaining · {data.usage_period === "lifetime" ? "one-time lifetime allowance" : "current calendar month"}.</p>
            {data.journey.payment_pending && <p className="mt-2 text-sm font-bold text-[#607282]">Checkout started; payment has not yet activated Pro access.</p>}
          </section>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BookOpenCheck} label="Completed sessions" value={data.session_summary.completed} />
            <MetricCard icon={Gauge} label={data.usage_period === "lifetime" ? "Sessions used in lifetime" : "Sessions used this month"} value={data.usage.sessions} tone="orange" />
            <MetricCard icon={BookOpenCheck} label={data.usage_period === "lifetime" ? "Questions used in lifetime" : "Questions used this month"} value={data.usage.questions} tone="violet" />
            <MetricCard icon={Gauge} label="Average score" value={formatPercent(data.session_summary.average_score)} tone="green" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="panel p-6">
              <h2 className="text-lg font-black text-[#032e4d]">Account</h2>
              <dl className="detail-list mt-5 grid gap-y-4 text-sm">
                <dt className="font-bold text-[#607282]">Status</dt><dd><StatusBadge value={data.user.status} /></dd>
                <dt className="font-bold text-[#607282]">Plan</dt><dd><StatusBadge value={data.user.plan} /></dd>
                <dt className="font-bold text-[#607282]">Language</dt><dd>{data.user.preferred_language.toUpperCase()}</dd>
                <dt className="font-bold text-[#607282]">Email verified</dt><dd>{data.user.email_verified ? "Yes" : "No"}</dd>
                <dt className="font-bold text-[#607282]">Age confirmed</dt><dd>{data.user.age_confirmed ? "Yes" : "No"}</dd>
                <dt className="font-bold text-[#607282]">Created</dt><dd>{formatDate(data.user.created_at, true)}</dd>
                <dt className="font-bold text-[#607282]">Last active</dt><dd>{formatDate(data.user.last_login_at, true)}</dd>
              </dl>
            </section>
            <section className="panel p-6">
              <h2 className="text-lg font-black text-[#032e4d]">Subscription</h2>
              {data.subscription ? (
                <dl className="detail-list mt-5 grid gap-y-4 text-sm">
                  <dt className="font-bold text-[#607282]">Status</dt><dd><StatusBadge value={data.subscription.status} /></dd>
                  <dt className="font-bold text-[#607282]">Period</dt><dd>{titleCase(data.subscription.billing_period)}</dd>
                  <dt className="font-bold text-[#607282]">Amount</dt><dd>{formatMinorAmount(data.subscription.amount, data.subscription.currency || "NGN")}</dd>
                  <dt className="font-bold text-[#607282]">Renews / ends</dt><dd>{formatDate(data.subscription.current_period_ends_at)}</dd>
                  <dt className="font-bold text-[#607282]">Grace ends</dt><dd>{formatDate(data.subscription.grace_ends_at)}</dd>
                </dl>
              ) : <p className="mt-5 text-sm text-[#607282]">No subscription record.</p>}
            </section>
          </div>
          <section className="panel mt-6 overflow-hidden">
            <div className="border-b border-[#dce5eb] p-5"><h2 className="text-lg font-black text-[#032e4d]">Recent sessions</h2><p className="mt-1 text-sm text-[#607282]">Metadata and outcomes only. Questions and answers are not exposed.</p></div>
            <div className="table-shell"><table className="data-table"><thead><tr><th>Exam</th><th>Status</th><th>Mode</th><th>Questions</th><th>Score</th><th>Created</th></tr></thead><tbody>
              {data.recent_sessions.map((session) => <tr key={session.id}><td className="font-black text-[#032e4d]">{session.exam_name}</td><td><StatusBadge value={session.status} /></td><td>{titleCase(session.mode)}</td><td>{session.num_questions ?? "N/A"}</td><td>{session.status === "completed" ? formatPercent(session.percentage) : "N/A"}</td><td>{formatDate(session.created_at)}</td></tr>)}
            </tbody></table></div>
          </section>
          <Modal open={Boolean(action)} title={action === "usage" ? (data.usage_period === "lifetime" ? "Adjust lifetime usage" : "Adjust monthly usage") : action === "delete" ? "Remove user access" : "Restore account"} onClose={() => setAction(null)}>
            {action === "usage" && <div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">Session change</span><input className="field" type="number" min={-100} max={100} value={sessionDelta} onChange={(event) => setSessionDelta(Number(event.target.value))} /></label><label><span className="field-label">Question change</span><input className="field" type="number" min={-10000} max={10000} value={questionDelta} onChange={(event) => setQuestionDelta(Number(event.target.value))} /></label></div>}
            {action === "delete" && <p className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">This removes user access but remains recoverable. No permanent deletion is performed.</p>}
            <label className="mt-4 block"><span className="field-label">Reason</span><textarea className="field min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit log" /></label>
            <div className="mt-5 flex justify-end gap-2"><button className="button-secondary" onClick={() => setAction(null)}>Cancel</button><button className={action === "delete" ? "button-danger" : "button-primary"} disabled={busy || reason.trim().length < 3 || (action === "usage" && !sessionDelta && !questionDelta)} onClick={submitAction}>{busy ? "Saving…" : "Confirm"}</button></div>
          </Modal>
        </>
      )}
    </AdminShell>
  );
}
