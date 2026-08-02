"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BrainCircuit,
  CircleDollarSign,
  CircleUserRound,
  Clock3,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  ErrorPanel,
  MetricCard,
  PageHeader,
  SectionTitle,
  Spinner,
  StatusBadge,
  TrendChart,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { Overview } from "@/lib/types";
import {
  formatDate,
  formatMinorAmount,
  formatPercent,
  formatUsd,
} from "@/lib/utils";

function range(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const query = useMemo(() => range(days), [days]);
  const overview = useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => apiRequest<Overview>(`/api/v1/admin/overview?${query}`),
  });
  const data = overview.data;
  const summary = data?.summary;
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Command centre"
        title="Overview"
        description="The core signals for learner activity, learning throughput, revenue, cost, and reliability."
        action={
          <select className="field w-40" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />
      {overview.isLoading ? (
        <div className="grid min-h-[55vh] place-items-center"><Spinner label="Loading platform overview" /></div>
      ) : overview.isError || !data || !summary ? (
        <div className="mt-8"><ErrorPanel error={overview.error} onRetry={() => overview.refetch()} /></div>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={UsersRound} label="Active users" value={summary.active_users} note={`${summary.new_users} new in this period`} />
            <MetricCard icon={Activity} label="Completed sessions" value={summary.completed_sessions} note={`${formatPercent(summary.completion_rate)} generated-to-completed`} tone="green" />
            <MetricCard icon={CircleUserRound} label="Pro learners" value={summary.pro_users} note={`${summary.total_users} registered accounts`} tone="violet" />
            <MetricCard icon={BrainCircuit} label="AI spend" value={formatUsd(summary.ai_cost_usd)} note={`Across ${days} days`} tone="orange" />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
            <section className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <SectionTitle title="Learning activity" note="Generated sessions and completed reports" />
                <div className="flex gap-4 text-xs font-bold text-[#607282]">
                  <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#ff6b00]" /> Generated</span>
                  <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-[#9eb3c0]" /> Completed</span>
                </div>
              </div>
              <div className="mt-6">
                <TrendChart
                  values={data.series.map((item) => item.sessions)}
                  secondary={data.series.map((item) => item.completions)}
                  labels={data.series.map((item) => formatDate(item.day))}
                />
              </div>
            </section>
            <section className="panel p-6">
              <SectionTitle title="Revenue received" note="Successful Paystack charges by currency" />
              <div className="mt-6 space-y-4">
                {data.revenue.length ? data.revenue.map((item) => (
                  <div key={item.currency} className="rounded-xl bg-[#f5f8fa] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-[#607282]">{item.currency}</p>
                    <p className="mt-1 text-2xl font-black text-[#032e4d]">{formatMinorAmount(item.amount, item.currency)}</p>
                  </div>
                )) : <p className="text-sm text-[#607282]">No successful charges in this period.</p>}
              </div>
            </section>
          </div>
          <section className="panel mt-6 p-6">
            <SectionTitle title="Operational watch" note="Signals that may require attention" />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-[#e2e9ed] p-4">
                <TriangleAlert className="mt-0.5 text-red-600" size={20} />
                <div><p className="text-xl font-black text-[#032e4d]">{summary.failed_jobs}</p><p className="text-sm font-bold text-[#526877]">Failed jobs</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#e2e9ed] p-4">
                <Clock3 className="mt-0.5 text-amber-600" size={20} />
                <div><p className="text-xl font-black text-[#032e4d]">{summary.pending_deletions}</p><p className="text-sm font-bold text-[#526877]">Soft-deleted accounts</p></div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#e2e9ed] p-4">
                <CircleDollarSign className="mt-0.5 text-emerald-600" size={20} />
                <div><StatusBadge value={summary.failed_jobs ? "pending" : "active"} /><p className="mt-2 text-sm font-bold text-[#526877]">Platform attention state</p></div>
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
