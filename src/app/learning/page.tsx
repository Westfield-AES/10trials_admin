"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Gauge, RotateCcw, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  BarList,
  ErrorPanel,
  MetricCard,
  PageHeader,
  PaginationControls,
  SectionTitle,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { LearningInsights, Pagination, SessionItem } from "@/lib/types";
import { formatDate, formatPercent, titleCase, withParams } from "@/lib/utils";

const LIMIT = 50;

function range(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

export default function LearningPage() {
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [offset, setOffset] = useState(0);
  const dateQuery = useMemo(() => range(days), [days]);
  const insights = useQuery({
    queryKey: ["learning-insights", days],
    queryFn: () => apiRequest<LearningInsights>(`/api/v1/admin/learning/insights?${dateQuery}`),
  });
  const sessionsPath = withParams("/api/v1/admin/sessions", { status, mode, limit: LIMIT, offset });
  const sessions = useQuery({
    queryKey: ["admin-sessions", status, mode, offset],
    queryFn: () => apiRequest<{ sessions: SessionItem[]; pagination: Pagination }>(sessionsPath),
  });
  const data = insights.data;
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Learning operations"
        title="Learning"
        description="Aggregated session outcomes and adoption patterns without exposing generated questions or learner answers."
        action={<select className="field w-40" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>}
      />
      {insights.isLoading ? (
        <div className="grid min-h-80 place-items-center"><Spinner label="Loading learning analytics" /></div>
      ) : insights.isError || !data ? (
        <div className="mt-7"><ErrorPanel error={insights.error} onRetry={() => insights.refetch()} /></div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BookOpenCheck} label="Generated sessions" value={data.summary.generated} />
            <MetricCard icon={Gauge} label="Completion rate" value={formatPercent(data.summary.completion_rate)} tone="green" />
            <MetricCard icon={RotateCcw} label="Weak-area retries" value={data.summary.retries} tone="orange" />
            <MetricCard icon={TimerReset} label="Average duration" value={`${Math.round(data.summary.average_duration_seconds / 60)} min`} tone="violet" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="panel p-6">
              <SectionTitle title="Most practised exams" note="Volume and completed-session score" />
              <div className="table-shell mt-5"><table className="data-table"><thead><tr><th>Exam</th><th>Sessions</th><th>Completed</th><th>Average score</th></tr></thead><tbody>
                {data.top_exams.map((exam) => <tr key={exam.exam_name}><td className="font-black text-[#032e4d]">{exam.exam_name}</td><td>{exam.sessions}</td><td>{exam.completed}</td><td>{formatPercent(exam.average_score)}</td></tr>)}
              </tbody></table></div>
            </section>
            <section className="panel p-6">
              <SectionTitle title="Session status" note="Where generated sessions ended up" />
              <div className="mt-6"><BarList items={(data.dimensions.status ?? []).map((item) => ({ label: item.label, value: item.value }))} /></div>
            </section>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {(["mode", "format", "difficulty", "language"] as const).map((dimension) => (
              <section className="panel p-5" key={dimension}>
                <SectionTitle title={titleCase(dimension)} />
                <div className="mt-5"><BarList items={(data.dimensions[dimension] ?? []).map((item) => ({ label: item.label, value: item.value }))} /></div>
              </section>
            ))}
          </div>
        </>
      )}
      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-[#dce5eb] p-5 md:flex-row md:items-end">
          <SectionTitle title="Session records" note="Metadata and result summaries only" />
          <div className="filter-row md:w-auto">
            <select className="field md:w-40" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}><option value="">All statuses</option>{["ready", "active", "completed", "abandoned", "failed"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select>
            <select className="field md:w-36" value={mode} onChange={(event) => { setMode(event.target.value); setOffset(0); }}><option value="">All modes</option><option value="learn">Learn</option><option value="simulate">Simulate</option></select>
          </div>
        </div>
        {sessions.isLoading ? <div className="grid min-h-64 place-items-center"><Spinner /></div> : sessions.isError ? <div className="p-5"><ErrorPanel error={sessions.error} onRetry={() => sessions.refetch()} /></div> : (
          <><div className="table-shell"><table className="data-table"><thead><tr><th>Exam</th><th>User</th><th>Status</th><th>Mode</th><th>Difficulty</th><th>Score</th><th>Created</th></tr></thead><tbody>
            {sessions.data?.sessions.map((session) => <tr key={session.id}><td><p className="max-w-64 truncate font-black text-[#032e4d]">{session.exam_name}</p><p className="text-xs text-[#607282]">{session.num_questions ?? 0} questions</p></td><td className="text-[#607282]">{session.user_email || "—"}</td><td><StatusBadge value={session.status} /></td><td>{titleCase(session.mode)}</td><td>{titleCase(session.difficulty)}</td><td>{session.status === "completed" ? formatPercent(session.percentage) : "—"}</td><td>{formatDate(session.created_at)}</td></tr>)}
          </tbody></table></div>{sessions.data && <PaginationControls offset={offset} limit={LIMIT} total={sessions.data.pagination.total} onChange={setOffset} />}</>
        )}
      </section>
    </AdminShell>
  );
}
