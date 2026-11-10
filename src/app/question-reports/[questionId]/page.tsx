"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminAuth } from "@/components/providers";
import {
  EmptyState,
  ErrorPanel,
  FeedbackBanner,
  Modal,
  PageHeader,
  SectionTitle,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { ApiError, apiRequest } from "@/lib/api";
import { reportReasons, type ReportDetail } from "@/lib/question-reports";
import { requestErrorMessage } from "@/lib/user-errors";
import { formatDate, titleCase } from "@/lib/utils";

export default function ReportedQuestionPage() {
  const { questionId } = useParams<{ questionId: string }>();
  const { admin } = useAdminAuth();
  const allowed = Boolean(admin?.permissions.includes("question_reports.read"));
  const canHandle = Boolean(
    admin?.permissions.includes("question_reports.manage"),
  );
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ["reported-question", questionId],
    queryFn: () =>
      apiRequest<ReportDetail>(
        `/api/v1/admin/question-reports/${encodeURIComponent(questionId)}`,
      ),
    enabled: allowed,
    refetchInterval: 30000,
  });
  const item = detail.data;
  const [action, setAction] = useState<"dismiss" | "withdraw" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  function choose(next: "dismiss" | "withdraw") {
    setAction(next);
    setReason("");
    setError(null);
  }
  async function submit() {
    if (!action || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{
        handled_reports: number;
        refunded_sessions: number;
      }>(`/api/v1/admin/question-reports/${questionId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      setAction(null);
      setFeedback({
        tone: "success",
        message:
          action === "withdraw"
            ? `Problem disabled. ${result.handled_reports} report(s) resolved; ${result.refunded_sessions} unfinished session(s) had their allowance restored.`
            : `${result.handled_reports} report(s) dismissed. The question remains available.`,
      });
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["reported-question", questionId],
        }),
        client.invalidateQueries({ queryKey: ["question-reports"] }),
        client.invalidateQueries({ queryKey: ["question-report-summary"] }),
      ]);
    } catch (nextError) {
      setError(requestErrorMessage(nextError));
      if (nextError instanceof ApiError && nextError.status === 409) {
        setAction(null);
        setFeedback({ tone: "error", message: nextError.message });
        await detail.refetch();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell>
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#526877]"
        href="/question-reports"
      >
        <ArrowLeft size={16} />
        Back to question reports
      </Link>
      <PageHeader
        eyebrow="Learner feedback"
        title="Reported question"
        description="Review learner feedback, then dismiss reports or disable the problem."
      />
      {feedback && <FeedbackBanner {...feedback} />}
      {admin && !allowed ? (
        <EmptyState message="Your role does not have access to question reports." />
      ) : detail.isLoading ? (
        <div className="grid min-h-80 place-items-center">
          <Spinner label="Loading the reported question" />
        </div>
      ) : detail.isError || !item ? (
        <div className="mt-6">
          <ErrorPanel error={detail.error} onRetry={() => detail.refetch()} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusBadge value={item.disabled ? "inactive" : "active"} />
            <p className="text-sm font-bold text-[#607282]">
              {item.open_count} open · {item.report_count} total reports
            </p>
          </div>
          {item.disabled && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
              Problem disabled globally: {item.disabled_reason}
            </p>
          )}
          <div className="mt-5 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="panel min-w-0 p-5 sm:p-6">
              <SectionTitle
                title="Question and reference answer"
                note={`${item.question.topic} · ${titleCase(item.question.type)}`}
              />
              <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-[#032e4d]">
                {item.question.question}
              </p>
              {item.question.options && (
                <div className="mt-5 space-y-2">
                  {Object.entries(item.question.options).map(
                    ([letter, text]) => (
                      <div
                        key={letter}
                        className={`flex gap-3 rounded-lg border p-3 ${letter === item.question.correct_answer ? "border-emerald-200 bg-emerald-50" : "border-[#dce5eb]"}`}
                      >
                        <span className="font-black">{letter}.</span>
                        <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6 text-[#334b5c]">
                          {text}
                          {letter === item.question.correct_answer && (
                            <span className="ml-2 text-xs font-black text-emerald-800">
                              Supplied answer
                            </span>
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
              {item.question.explanation && (
                <div className="mt-5">
                  <h3 className="font-black text-[#032e4d]">Explanation</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526877]">
                    {item.question.explanation}
                  </p>
                </div>
              )}
              {item.question.model_answer && (
                <div className="mt-5">
                  <h3 className="font-black text-[#032e4d]">Model answer</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#526877]">
                    {item.question.model_answer}
                  </p>
                </div>
              )}
              {!!item.question.marking_criteria?.length && (
                <div className="mt-5">
                  <h3 className="font-black text-[#032e4d]">
                    Marking criteria
                  </h3>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[#526877]">
                    {item.question.marking_criteria.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {canHandle && item.open_count > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {!item.disabled && (
                    <button
                      className="button-primary"
                      onClick={() => choose("withdraw")}
                    >
                      <Ban size={16} />
                      Disable this problem
                    </button>
                  )}
                  <button
                    className="button-secondary"
                    onClick={() => choose("dismiss")}
                  >
                    <XCircle size={16} />
                    Dismiss open reports
                  </button>
                </div>
              )}
              {!canHandle && (
                <p className="mt-5 text-sm text-[#607282]">
                  Your role can read reports. Handling them requires
                  report-management permission.
                </p>
              )}
            </section>
            <section className="panel min-w-0 p-5 sm:p-6">
              <SectionTitle
                title="Learner reports"
                note="Reports are grouped by the exact question version. Learner answers are excluded."
              />
              <ol className="mt-5 space-y-5">
                {item.reports.map((report) => (
                  <li
                    key={report.id}
                    className="border-l-2 border-[#dce5eb] pl-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-[#032e4d]">
                        {reportReasons[report.reason] ||
                          titleCase(report.reason)}
                      </h3>
                      <StatusBadge value={report.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#607282]">
                      {report.exam_name} · {formatDate(report.created_at, true)}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#526877]">
                      {report.comment || "No additional details supplied."}
                    </p>
                    {report.presented_question?.options && (
                      <details className="mt-3 rounded-lg border border-[#dce5eb] p-3">
                        <summary className="cursor-pointer text-sm font-bold text-[#032e4d]">
                          Options shown to this learner
                        </summary>
                        <ol className="mt-3 space-y-2 text-sm leading-6 text-[#526877]">
                          {Object.entries(
                            report.presented_question.options,
                          ).map(([letter, text]) => (
                            <li key={letter}>
                              <strong>{letter}.</strong> {text}
                              {letter ===
                                report.presented_question?.correct_answer && (
                                <span className="ml-2 font-bold text-emerald-800">
                                  Supplied answer
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                        {report.presented_question.explanation && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#526877]">
                            {report.presented_question.explanation}
                          </p>
                        )}
                      </details>
                    )}
                    {report.resolution_note && (
                      <p className="mt-3 rounded-lg bg-[#f4f8fa] p-3 text-sm leading-6 text-[#334b5c]">
                        Resolution: {report.resolution_note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {item.report_count > item.reports.length && (
                <p className="mt-4 text-xs text-[#607282]">
                  Showing the latest {item.reports.length} reports, with open
                  reports first.
                </p>
              )}
            </section>
          </div>
        </>
      )}
      <Modal
        open={Boolean(action)}
        title={
          action === "withdraw"
            ? "Disable this problem"
            : "Dismiss open reports"
        }
        onClose={() => {
          if (!busy) setAction(null);
        }}
      >
        <p className="text-sm leading-6 text-[#607282]">
          {action === "withdraw"
            ? "This removes the problem from future bank reuse across exam contexts, resolves open reports on its variants, and restores the allowance for affected unfinished sessions. Completed historical reports remain available."
            : "Dismiss open reports if the question and reference answer are valid. This keeps the question available for reuse."}
        </p>
        <label className="mt-4 block">
          <span className="field-label">Reason</span>
          <textarea
            className="field min-h-24"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            disabled={busy}
          />
        </label>
        {error && <FeedbackBanner tone="error" message={error} />}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="button-secondary"
            disabled={busy}
            onClick={() => setAction(null)}
          >
            Cancel
          </button>
          <button
            className="button-primary"
            disabled={busy || reason.trim().length < 3}
            onClick={submit}
          >
            {busy ? "Saving…" : "Save action"}
          </button>
        </div>
      </Modal>
    </AdminShell>
  );
}
