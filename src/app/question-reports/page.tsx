"use client";

import {
  CheckCircle2,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminAuth, useAdminQuery } from "@/components/providers";
import {
  EmptyState,
  ErrorPanel,
  MetricCard,
  PageHeader,
  PaginationControls,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { ReportGroup, ReportSummary } from "@/lib/question-reports";
import type { Pagination } from "@/lib/types";
import { formatDate, titleCase, withParams } from "@/lib/utils";

const LIMIT = 25;
export default function QuestionReportsPage() {
  const { admin } = useAdminAuth();
  const allowed = Boolean(admin?.permissions.includes("question_reports.read"));
  const [status, setStatus] = useState("open");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const summary = useAdminQuery("question_reports.read", {
    queryKey: ["question-report-summary"],
    queryFn: () =>
      apiRequest<ReportSummary>("/api/v1/admin/question-reports/summary"),
    refetchInterval: 30000,
  });
  const reports = useAdminQuery("question_reports.read", {
    queryKey: ["question-reports", status, search, offset],
    queryFn: () =>
      apiRequest<{ questions: ReportGroup[]; pagination: Pagination }>(
        withParams("/api/v1/admin/question-reports", {
          status,
          search,
          limit: LIMIT,
          offset,
        }),
      ),
    refetchInterval: 30000,
  });
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Learner feedback"
        title="Question reports"
        description="Review learner feedback about question accuracy, wording and relevance."
      />
      {admin && !allowed ? (
        <EmptyState message="Your role does not have access to question reports." />
      ) : (
        <>
          {summary.isError ? (
            <div className="mt-6">
              <ErrorPanel
                error={summary.error}
                onRetry={() => summary.refetch()}
              />
            </div>
          ) : (
            summary.data && (
              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={MessageSquareWarning}
                  label="Open reports"
                  value={summary.data.open_reports}
                  tone="orange"
                />
                <MetricCard
                  icon={ShieldCheck}
                  label="Questions reported"
                  value={summary.data.reported_questions}
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Resolved reports"
                  value={summary.data.resolved}
                  tone="green"
                />
                <MetricCard
                  icon={XCircle}
                  label="Dismissed reports"
                  value={summary.data.dismissed}
                  tone="violet"
                />
              </div>
            )
          )}
          <section className="panel mt-6 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[#dce5eb] p-5 lg:flex-row lg:items-end lg:justify-between">
              <label className="block lg:w-48">
                <span className="field-label">Report status</span>
                <select
                  className="field"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setOffset(0);
                  }}
                >
                  {["open", "resolved", "dismissed", "all"].map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
                </select>
              </label>
              <form
                className="flex min-w-0 flex-1 items-end gap-2 lg:max-w-lg"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(searchInput.trim());
                  setOffset(0);
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="field-label">Search reports</span>
                  <input
                    className="field"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Exam, topic or question"
                    maxLength={120}
                  />
                </label>
                <button className="button-secondary" type="submit">
                  <Search size={16} />
                  <span className="sr-only sm:not-sr-only">Search</span>
                </button>
              </form>
            </div>
            {reports.isLoading ? (
              <div className="grid min-h-64 place-items-center">
                <Spinner label="Loading reported questions" />
              </div>
            ) : reports.isError ? (
              <div className="p-5">
                <ErrorPanel
                  error={reports.error}
                  onRetry={() => reports.refetch()}
                />
              </div>
            ) : !reports.data?.questions.length ? (
              <EmptyState message="No reported questions match these filters." />
            ) : (
              <>
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Exams</th>
                        <th>Reports</th>
                        <th>Bank status</th>
                        <th>Latest report</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {reports.data.questions.map((question) => (
                        <tr key={question.question_id}>
                          <td className="min-w-64 max-w-md">
                            <Link
                              className="line-clamp-2 font-bold text-[#032e4d] hover:text-[#e85b00]"
                              href={`/question-reports/${question.question_id}`}
                            >
                              {question.question_preview}
                            </Link>
                            <p className="mt-1 text-xs text-[#607282]">
                              {question.topic} ·{" "}
                              {titleCase(question.question_type)}
                            </p>
                          </td>
                          <td className="max-w-64 text-sm">
                            {question.exams.join(", ")}
                          </td>
                          <td>{question.report_count}</td>
                          <td>
                            <StatusBadge
                              value={question.disabled ? "inactive" : "active"}
                            />
                          </td>
                          <td className="whitespace-nowrap">
                            {formatDate(question.last_reported_at, true)}
                          </td>
                          <td>
                            <Link
                              className="button-secondary min-h-9"
                              href={`/question-reports/${question.question_id}`}
                            >
                              Open reports
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  offset={offset}
                  limit={LIMIT}
                  total={reports.data.pagination.total}
                  onChange={setOffset}
                />
              </>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
