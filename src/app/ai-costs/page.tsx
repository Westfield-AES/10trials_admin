"use client";

import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Coins, DatabaseZap, SearchCode } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { BarList, ErrorPanel, MetricCard, PageHeader, SectionTitle, Spinner, TrendChart } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { AiSummary } from "@/lib/types";
import { formatDate, formatNumber, formatUsd } from "@/lib/utils";

function range(days: number) { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - days); return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`; }

export default function AiCostsPage() {
  const [days, setDays] = useState(30);
  const dateQuery = useMemo(() => range(days), [days]);
  const query = useQuery({ queryKey: ["ai-summary", days], queryFn: () => apiRequest<AiSummary>(`/api/v1/admin/ai/summary?${dateQuery}`) });
  const data = query.data;
  return <AdminShell>
    <PageHeader eyebrow="Provider economics" title="AI & costs" description="Anthropic calls, tokens, cache use, web search, and estimated cost from the backend-owned usage ledger." action={<select className="field w-40" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} />
    {query.isLoading ? <div className="grid min-h-[55vh] place-items-center"><Spinner label="Loading AI usage" /></div> : query.isError || !data ? <div className="mt-7"><ErrorPanel error={query.error} onRetry={() => query.refetch()} /></div> : <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Coins} label="Estimated spend" value={formatUsd(data.summary.cost_usd)} tone="orange" />
        <MetricCard icon={BrainCircuit} label="Provider calls" value={data.summary.calls} />
        <MetricCard icon={DatabaseZap} label="Tokens" value={formatNumber(data.summary.input_tokens + data.summary.output_tokens, true)} note={`${formatNumber(data.summary.cache_read_tokens, true)} cache-read tokens`} tone="violet" />
        <MetricCard icon={SearchCode} label="Web searches" value={data.summary.web_searches} tone="green" />
      </div>
      <section className="panel mt-6 p-6"><SectionTitle title="Daily cost" note="Estimated USD based on the backend pricing map" /><div className="mt-5"><TrendChart values={data.by_day.map((item) => item.cost_usd)} labels={data.by_day.map((item) => formatDate(item.day))} /></div></section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="panel p-6"><SectionTitle title="Cost by model" /><div className="mt-6"><BarList items={data.by_model.map((item) => ({ label: item.model, value: item.cost_usd }))} /></div></section><section className="panel p-6"><SectionTitle title="Cost by stage" /><div className="mt-6"><BarList items={data.by_stage.map((item) => ({ label: item.stage, value: item.cost_usd }))} /></div></section></div>
      <section className="panel mt-6 overflow-hidden"><div className="border-b border-[#dce5eb] p-5"><SectionTitle title="Highest-cost users" note="Operational cost view; no learner content is exposed" /></div><div className="table-shell"><table className="data-table"><thead><tr><th>User</th><th>Calls</th><th>Estimated cost</th></tr></thead><tbody>{data.top_users.map((item) => <tr key={item.user_id}><td className="font-bold text-[#032e4d]">{item.user_email || item.user_id}</td><td>{formatNumber(item.calls)}</td><td>{formatUsd(item.cost_usd)}</td></tr>)}</tbody></table></div></section>
    </>}
  </AdminShell>;
}
