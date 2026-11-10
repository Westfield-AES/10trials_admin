"use client";

import { CircleDollarSign, CreditCard, ReceiptText, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminQuery } from "@/components/providers";
import { BarList, ErrorPanel, MetricCard, PageHeader, SectionTitle, Spinner, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { BillingSummary, Pagination, SubscriptionItem, TransactionItem } from "@/lib/types";
import { formatDate, formatMinorAmount, titleCase, withParams } from "@/lib/utils";

function range(days: number) { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - days); return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`; }

export default function BillingPage() {
  const [days, setDays] = useState(30);
  const dateQuery = useMemo(() => range(days), [days]);
  const summary = useAdminQuery("billing.read", { queryKey: ["billing-summary", days], queryFn: () => apiRequest<BillingSummary>(`/api/v1/admin/billing/summary?${dateQuery}`) });
  const subscriptions = useAdminQuery("billing.read", { queryKey: ["admin-subscriptions"], queryFn: () => apiRequest<{ subscriptions: SubscriptionItem[]; pagination: Pagination }>(withParams("/api/v1/admin/subscriptions", { limit: 50 })) });
  const transactions = useAdminQuery("billing.read", { queryKey: ["admin-transactions"], queryFn: () => apiRequest<{ transactions: TransactionItem[]; pagination: Pagination }>(withParams("/api/v1/admin/transactions", { limit: 50 })) });
  const data = summary.data;
  const revenueLabel = data?.revenue.map((item) => formatMinorAmount(item.amount, item.currency)).join(" · ") || "N/A";
  const mrrLabel = data?.mrr.map((item) => formatMinorAmount(item.amount, item.currency)).join(" · ") || "N/A";
  const activeSubscriptions = data?.subscription_statuses.filter((item) => ["active", "trialing", "grace", "non_renewing"].includes(item.status)).reduce((sum, item) => sum + item.value, 0) ?? 0;
  return <AdminShell>
    <PageHeader eyebrow="Commercial operations" title="Billing" description="Current subscription state and sanitized Paystack transaction events. Raw provider payloads are never returned." action={<select className="field w-40" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>} />
    {summary.isLoading ? <div className="grid min-h-80 place-items-center"><Spinner label="Loading billing metrics" /></div> : summary.isError || !data ? <div className="mt-7"><ErrorPanel error={summary.error} onRetry={() => summary.refetch()} /></div> : <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CircleDollarSign} label="Revenue received" value={revenueLabel} note={`Successful charges · ${days} days`} tone="green" />
        <MetricCard icon={CreditCard} label="Estimated MRR" value={mrrLabel} note="Annual plans normalized monthly" tone="violet" />
        <MetricCard icon={ReceiptText} label="Active entitlements" value={activeSubscriptions} />
        <MetricCard icon={TriangleAlert} label="Payment failures" value={data.payment_failures} tone={data.payment_failures ? "red" : "green"} />
      </div>
      <section className="panel mt-6 p-6"><SectionTitle title="Subscription state" /><div className="mt-5 max-w-xl"><BarList items={data.subscription_statuses.map((item) => ({ label: item.status, value: item.value }))} /></div></section>
    </>}
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <section className="panel overflow-hidden"><div className="border-b border-[#dce5eb] p-5"><SectionTitle title="Subscriptions" note="Latest application-owned subscription state" /></div>{subscriptions.isLoading ? <div className="grid min-h-64 place-items-center"><Spinner /></div> : subscriptions.isError ? <div className="p-5"><ErrorPanel error={subscriptions.error} /></div> : <div className="table-shell"><table className="data-table"><thead><tr><th>User</th><th>Status</th><th>Plan</th><th>Amount</th><th>Period end</th></tr></thead><tbody>{subscriptions.data?.subscriptions.map((item) => <tr key={item.id}><td>{item.user_email || "N/A"}</td><td><StatusBadge value={item.status} /></td><td>{titleCase(item.billing_period)}</td><td>{formatMinorAmount(item.amount, item.currency || "NGN")}</td><td>{formatDate(item.current_period_ends_at)}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel overflow-hidden"><div className="border-b border-[#dce5eb] p-5"><SectionTitle title="Payment events" note="Sanitized transaction ledger" /></div>{transactions.isLoading ? <div className="grid min-h-64 place-items-center"><Spinner /></div> : transactions.isError ? <div className="p-5"><ErrorPanel error={transactions.error} /></div> : <div className="table-shell"><table className="data-table"><thead><tr><th>Event</th><th>User</th><th>Amount</th><th>Processed</th><th>Received</th></tr></thead><tbody>{transactions.data?.transactions.map((item) => <tr key={item.id}><td className="font-bold text-[#032e4d]">{titleCase(item.event_type)}</td><td>{item.user_email || "Unlinked"}</td><td>{formatMinorAmount(item.amount, item.currency || "NGN")}</td><td><StatusBadge value={item.processed_at ? "completed" : "pending"} /></td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table></div>}</section>
    </div>
  </AdminShell>;
}
