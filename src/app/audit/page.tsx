"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { EmptyState, ErrorPanel, PageHeader, PaginationControls, Spinner, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { AuditLog, Pagination } from "@/lib/types";
import { formatDate, titleCase, withParams } from "@/lib/utils";

const LIMIT = 50;

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const query = useQuery({ queryKey: ["audit-logs", action, offset], queryFn: () => apiRequest<{ logs: AuditLog[]; pagination: Pagination }>(withParams("/api/v1/admin/audit-logs", { action, limit: LIMIT, offset })) });
  return <AdminShell>
    <PageHeader eyebrow="Governance" title="Audit log" description="A permanent record of successful administrator mutations, including actor, reason, target, and request ID." action={<select className="field w-52" value={action} onChange={(event) => { setAction(event.target.value); setOffset(0); }}><option value="">All actions</option>{["usage.adjust", "account.soft_delete", "account.restore", "job.retry", "admin.create", "admin.update"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}</select>} />
    <section className="panel mt-7 overflow-hidden">
      {query.isLoading ? <div className="grid min-h-72 place-items-center"><Spinner label="Loading audit trail" /></div> : query.isError ? <div className="p-5"><ErrorPanel error={query.error} onRetry={() => query.refetch()} /></div> : query.data?.logs.length ? <><div className="table-shell"><table className="data-table"><thead><tr><th>Action</th><th>Administrator</th><th>Target</th><th>Reason / metadata</th><th>Request</th><th>Time</th></tr></thead><tbody>{query.data.logs.map((log) => { const metadata = typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata); return <tr key={log.id}><td><StatusBadge value={log.action} /></td><td><p className="font-bold text-[#032e4d]">{log.admin_email || "Unknown admin"}</p><p className="font-mono text-[10px] text-[#82919c]">{log.admin_firebase_uid.slice(0, 10)}</p></td><td>{titleCase(log.target_type)}{log.target_id && <p className="font-mono text-[10px] text-[#82919c]">{log.target_id.slice(0, 12)}</p>}</td><td><p className="max-w-80 truncate text-[#607282]" title={metadata}>{metadata}</p></td><td className="font-mono text-[10px] text-[#607282]">{log.request_id?.slice(0, 12) || "—"}</td><td>{formatDate(log.created_at, true)}</td></tr>; })}</tbody></table></div><PaginationControls offset={offset} limit={LIMIT} total={query.data.pagination.total} onChange={setOffset} /></> : <div className="flex flex-col items-center py-14"><ClipboardList className="text-[#9eb0bc]" /><EmptyState message="No audited actions match this filter." /></div>}
    </section>
  </AdminShell>;
}
