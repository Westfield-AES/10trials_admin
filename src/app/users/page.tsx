"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  EmptyState,
  ErrorPanel,
  PageHeader,
  PaginationControls,
  Spinner,
  StatusBadge,
} from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { Pagination, UserListItem } from "@/lib/types";
import { formatDate, withParams } from "@/lib/utils";

const LIMIT = 50;

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [offset, setOffset] = useState(0);
  const path = withParams("/api/v1/admin/users", {
    query: appliedSearch,
    status,
    plan,
    limit: LIMIT,
    offset,
  });
  const users = useQuery({
    queryKey: ["admin-users", appliedSearch, status, plan, offset],
    queryFn: () => apiRequest<{ users: UserListItem[]; pagination: Pagination }>(path),
  });
  return (
    <AdminShell>
      <PageHeader
        eyebrow="Account operations"
        title="Users"
        description="Find learner accounts, inspect usage and subscription state, and handle approved support actions."
      />
      <form
        className="panel mt-7 grid gap-3 p-4 md:grid-cols-[1fr_180px_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setAppliedSearch(search.trim());
        }}
      >
        <label className="relative">
          <span className="sr-only">Search users</span>
          <Search className="absolute left-3 top-3 text-[#82919c]" size={17} />
          <input className="field pl-10" placeholder="Email or display name" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select className="field" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="soft_deleted">Soft deleted</option>
        </select>
        <select className="field" value={plan} onChange={(event) => { setPlan(event.target.value); setOffset(0); }}>
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <button className="button-primary"><Search size={16} /> Apply</button>
      </form>
      <section className="panel mt-5 overflow-hidden">
        {users.isLoading ? (
          <div className="grid min-h-72 place-items-center"><Spinner label="Loading users" /></div>
        ) : users.isError ? (
          <div className="p-5"><ErrorPanel error={users.error} onRetry={() => users.refetch()} /></div>
        ) : users.data?.users.length ? (
          <>
            <div className="table-shell">
              <table className="data-table">
                <thead><tr><th>User</th><th>Status</th><th>Plan</th><th>Usage</th><th>Completed</th><th>Last active</th><th /></tr></thead>
                <tbody>
                  {users.data.users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <p className="font-black text-[#032e4d]">{user.display_name || "Unnamed learner"}</p>
                        <p className="mt-0.5 text-xs text-[#607282]">{user.email || "No email"}</p>
                      </td>
                      <td><StatusBadge value={user.status} /></td>
                      <td><StatusBadge value={user.plan} /></td>
                      <td><span className="font-black text-[#032e4d]">{user.sessions_used}</span><span className="text-[#607282]"> sessions</span></td>
                      <td>{user.completed_sessions}</td>
                      <td className="whitespace-nowrap text-[#607282]">{formatDate(user.last_login_at)}</td>
                      <td className="text-right"><Link className="font-black text-[#c94d00] hover:underline" href={`/users/${user.id}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls offset={offset} limit={LIMIT} total={users.data.pagination.total} onChange={setOffset} />
          </>
        ) : (
          <div className="flex flex-col items-center py-14"><UsersRound className="text-[#9eb0bc]" /><EmptyState message="No users match these filters." /></div>
        )}
      </section>
    </AdminShell>
  );
}
