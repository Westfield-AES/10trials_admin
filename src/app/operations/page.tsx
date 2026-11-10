"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Activity, CircleCheck, Clock3, RefreshCw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminAuth, useAdminQuery } from "@/components/providers";
import { BarList, ErrorPanel, FeedbackBanner, MetricCard, Modal, PageHeader, PaginationControls, SectionTitle, Spinner, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { JobItem, JobsSummary, Pagination } from "@/lib/types";
import { requestErrorMessage } from "@/lib/user-errors";
import { formatDate, titleCase, withParams } from "@/lib/utils";

const LIMIT = 50;
function range(days: number) { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - days); return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`; }

export default function OperationsPage() {
  const { admin } = useAdminAuth();
  const client = useQueryClient();
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState("");
  const [jobType, setJobType] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<JobItem | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const dateQuery = useMemo(() => range(days), [days]);
  const summary = useAdminQuery("jobs.read", { queryKey: ["jobs-summary", days], queryFn: () => apiRequest<JobsSummary>(`/api/v1/admin/jobs/summary?${dateQuery}`) });
  const jobsPath = withParams("/api/v1/admin/jobs", { status, job_type: jobType, limit: LIMIT, offset });
  const jobs = useAdminQuery("jobs.read", { queryKey: ["admin-jobs", status, jobType, offset], queryFn: () => apiRequest<{ jobs: JobItem[]; pagination: Pagination }>(jobsPath) });

  async function retry() {
    if (!selected) return;
    setBusy(true); setFeedback(null);
    try {
      await apiRequest(`/api/v1/admin/jobs/${selected.id}/retry`, { method: "POST", body: JSON.stringify({ reason }) });
      setSelected(null); setReason(""); setFeedback({ message: "The background task has been queued again.", tone: "success" });
      await client.invalidateQueries({ queryKey: ["admin-jobs"] });
      await client.invalidateQueries({ queryKey: ["jobs-summary"] });
    } catch (error) { setFeedback({ message: requestErrorMessage(error), tone: "error" }); }
    finally { setBusy(false); }
  }

  const data = summary.data;
  return <AdminShell>
    <PageHeader eyebrow="Platform reliability" title="Operations" description="Queue health, execution time, failures, and controlled retries for live durable jobs." action={<select className="field w-40" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} />
    {feedback && <FeedbackBanner {...feedback} />}
    {summary.isLoading ? <div className="grid min-h-72 place-items-center"><Spinner label="Loading job health" /></div> : summary.isError || !data ? <div className="mt-7"><ErrorPanel error={summary.error} onRetry={() => summary.refetch()} /></div> : <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Jobs created" value={data.summary.total} />
        <MetricCard icon={CircleCheck} label="Succeeded" value={data.summary.succeeded} tone="green" />
        <MetricCard icon={TriangleAlert} label="Failed" value={data.summary.failed} tone={data.summary.failed ? "red" : "green"} />
        <MetricCard icon={Clock3} label="Average runtime" value={`${data.summary.average_runtime_seconds.toFixed(1)}s`} tone="violet" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"><section className="panel overflow-hidden"><div className="border-b border-[#dce5eb] p-5"><SectionTitle title="Performance by job type" /></div><div className="table-shell"><table className="data-table"><thead><tr><th>Job type</th><th>Total</th><th>Failed</th><th>Average runtime</th></tr></thead><tbody>{data.by_type.map((item) => <tr key={item.job_type}><td className="font-black text-[#032e4d]">{titleCase(item.job_type)}</td><td>{item.total}</td><td>{item.failed}</td><td>{item.average_runtime_seconds.toFixed(1)}s</td></tr>)}</tbody></table></div></section><section className="panel p-6"><SectionTitle title="Top errors" />{data.errors.length ? <div className="mt-5"><BarList items={data.errors.map((item) => ({ label: item.error_code, value: item.value }))} /></div> : <p className="mt-5 text-sm text-[#607282]">No job errors in this period.</p>}</section></div>
    </>}
    <section className="panel mt-6 overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-[#dce5eb] p-5 md:flex-row md:items-end"><SectionTitle title="Job ledger" note="Worker payloads and results are excluded" /><div className="filter-row md:w-auto"><select className="field md:w-36" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}><option value="">All statuses</option>{["queued", "running", "succeeded", "failed", "cancelled"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select><select className="field md:w-48" value={jobType} onChange={(event) => { setJobType(event.target.value); setOffset(0); }}><option value="">All job types</option>{["discover_exam", "generate_session", "grade_answer", "finalize_session", "expire_simulation", "send_email", "expire_entitlement"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select></div></div>
      {jobs.isLoading ? <div className="grid min-h-64 place-items-center"><Spinner /></div> : jobs.isError ? <div className="p-5"><ErrorPanel error={jobs.error} onRetry={() => jobs.refetch()} /></div> : <><div className="table-shell"><table className="data-table"><thead><tr><th>Job</th><th>User</th><th>Status</th><th>Attempts</th><th>Error</th><th>Created</th><th /></tr></thead><tbody>{jobs.data?.jobs.map((job) => <tr key={job.id}><td><p className="font-black text-[#032e4d]">{titleCase(job.job_type)}</p><p className="font-mono text-[10px] text-[#82919c]">{job.id.slice(0, 8)}</p></td><td>{job.user_email || "System"}</td><td><StatusBadge value={job.status} /></td><td>{job.attempts}</td><td><p className="max-w-52 truncate text-[#607282]" title={job.error_message || undefined}>{job.error_code ? titleCase(job.error_code) : "N/A"}</p></td><td>{formatDate(job.created_at, true)}</td><td>{admin?.permissions.includes("jobs.retry") && ["failed", "cancelled"].includes(job.status) ? <button className="button-secondary min-h-9" onClick={() => setSelected(job)}><RefreshCw size={14} /> Retry</button> : null}</td></tr>)}</tbody></table></div>{jobs.data && <PaginationControls offset={offset} limit={LIMIT} total={jobs.data.pagination.total} onChange={setOffset} />}</>}
    </section>
    <Modal open={Boolean(selected)} title="Retry background job" onClose={() => setSelected(null)}><p className="text-sm leading-6 text-[#607282]">Recent saved jobs can be retried. The action is written to the audit log.</p><label className="mt-4 block"><span className="field-label">Reason</span><textarea className="field min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="mt-5 flex justify-end gap-2"><button className="button-secondary" onClick={() => setSelected(null)}>Cancel</button><button className="button-primary" disabled={busy || reason.trim().length < 3} onClick={retry}>{busy ? "Requeueing…" : "Retry job"}</button></div></Modal>
  </AdminShell>;
}
