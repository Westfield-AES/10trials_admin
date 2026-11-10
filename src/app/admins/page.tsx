"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminQuery } from "@/components/providers";
import { ErrorPanel, FeedbackBanner, Modal, PageHeader, Spinner, StatusBadge } from "@/components/ui";
import { apiRequest } from "@/lib/api";
import type { AdminMember, AdminRole } from "@/lib/types";
import { requestErrorMessage } from "@/lib/user-errors";
import { formatDate, titleCase } from "@/lib/utils";

const roles: AdminRole[] = ["owner", "operations", "support", "viewer"];

export default function AdminsPage() {
  const client = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole>("viewer");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const admins = useAdminQuery("admins.manage", { queryKey: ["admin-members"], queryFn: () => apiRequest<{ admins: AdminMember[] }>("/api/v1/admin/admins") });

  function closeCreate() {
    setCreateOpen(false);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setCreateError(null);
    setRole("viewer");
  }

  async function createAdmin() {
    const strongPassword = password.length >= 12
      && /[a-z]/.test(password)
      && /[A-Z]/.test(password)
      && /\d/.test(password)
      && /[^A-Za-z0-9]/.test(password);
    if (displayName.trim().length < 2) {
      setCreateError("Enter the administrator’s name.");
      return;
    }
    if (!strongPassword) {
      setCreateError("Use at least 12 characters with uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setCreateError("The passwords do not match. Re-enter them and try again.");
      return;
    }
    setBusy(true); setFeedback(null);
    setCreateError(null);
    try {
      await apiRequest("/api/v1/admin/admins", { method: "POST", body: JSON.stringify({ display_name: displayName.trim(), email: email.trim(), password, role }) });
      closeCreate();
      setFeedback({ message: "Administrator created. They can now sign in with the email and password you set.", tone: "success" });
      await client.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (error) { setCreateError(requestErrorMessage(error)); }
    finally { setBusy(false); }
  }

  async function updateAdmin() {
    if (!selected) return;
    setBusy(true); setFeedback(null);
    try {
      await apiRequest(`/api/v1/admin/admins/${selected.id}`, { method: "PATCH", body: JSON.stringify({ role, status, reason }) });
      setSelected(null); setReason("");
      setFeedback({ message: "Administrator access updated. Ask them to sign out and back in to see the change.", tone: "success" });
      await client.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (error) { setFeedback({ message: requestErrorMessage(error), tone: "error" }); }
    finally { setBusy(false); }
  }

  return <AdminShell>
    <PageHeader eyebrow="Access control" title="Administrators" description="Manage who can use this workspace and what they are allowed to do." action={<button className="button-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Add administrator</button>} />
    {feedback && <FeedbackBanner {...feedback} />}
    <section className="panel mt-7 overflow-hidden">
      <div className="border-b border-[#dce5eb] bg-[#f8fafb] p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#e8f3fa] text-[#07436c]"><ShieldCheck size={18} /></span><div><h2 className="font-black text-[#032e4d]">Role membership</h2><p className="text-xs text-[#607282]">The last active owner cannot be demoted or deactivated.</p></div></div></div>
      {admins.isLoading ? <div className="grid min-h-72 place-items-center"><Spinner label="Loading administrators" /></div> : admins.isError ? <div className="p-5"><ErrorPanel error={admins.error} onRetry={() => admins.refetch()} /></div> : <div className="table-shell"><table className="data-table"><thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Last access</th><th>Added</th><th /></tr></thead><tbody>{admins.data?.admins.map((member) => <tr key={member.id}><td><p className="font-black text-[#032e4d]">{member.display_name || "Unnamed administrator"}</p><p className="text-xs text-[#607282]">{member.email}</p></td><td><StatusBadge value={member.role} /></td><td><StatusBadge value={member.status} /></td><td>{formatDate(member.last_login_at, true)}</td><td>{formatDate(member.created_at)}</td><td className="text-right"><button className="button-secondary min-h-9" onClick={() => { setSelected(member); setRole(member.role); setStatus(member.status); }}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel mt-6 p-6"><h2 className="text-lg font-black text-[#032e4d]">Role summary</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Owner", "All read access, approved mutations, and administrator management."],
      ["Operations", "Platform, job, AI, billing, exam analytics, audit, and safe job retry access."],
      ["Support", "User, exam analytics, billing, and audited quota adjustment access."],
      ["Viewer", "Read-only overview, exam analytics, billing, and AI analytics."],
    ].map(([name, copy]) => <article key={name} className="rounded-xl border border-[#e2e9ed] p-4"><p className="font-black text-[#032e4d]">{name}</p><p className="mt-2 text-xs leading-5 text-[#607282]">{copy}</p></article>)}</div></section>
    <Modal open={createOpen} title="Create administrator" onClose={closeCreate}>
      <p className="text-sm leading-6 text-[#607282]">This creates an independent administrator account. The same email may also belong to a 10Trials user; passwords, sessions, and permissions remain separate.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label><span className="field-label">Full name</span><input className="field" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        <label><span className="field-label">Role</span><select className="field" value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>{roles.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}</select></label>
      </div>
      <label className="mt-4 block"><span className="field-label">Administrator email</span><input className="field" type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="mt-4 block">
        <span className="field-label">Password</span>
        <span className="relative block">
          <input className="field pr-12" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#607282]" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span>
        <span className="mt-1.5 block text-xs leading-5 text-[#718392]">At least 12 characters, including uppercase, lowercase, a number, and a symbol.</span>
      </label>
      <label className="mt-4 block"><span className="field-label">Confirm password</span><input className="field" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
      {createError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-5 text-red-900" role="alert">{createError}</div>}
      <div className="mt-5 flex justify-end gap-2"><button className="button-secondary" disabled={busy} onClick={closeCreate}>Cancel</button><button className="button-primary" disabled={busy || !email.includes("@") || !displayName.trim() || !password || !confirmPassword} onClick={createAdmin}>{busy ? "Creating…" : "Create administrator"}</button></div>
    </Modal>
    <Modal open={Boolean(selected)} title="Update administrator" onClose={() => setSelected(null)}>{selected && <><p className="text-sm font-bold text-[#032e4d]">{selected.email}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Role</span><select className="field" value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>{roles.map((item) => <option value={item} key={item}>{titleCase(item)}</option>)}</select></label><label><span className="field-label">Status</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value as "active" | "inactive")}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><label className="mt-4 block"><span className="field-label">Reason</span><textarea className="field min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit log" /></label><div className="mt-5 flex justify-end gap-2"><button className="button-secondary" onClick={() => setSelected(null)}>Cancel</button><button className="button-primary" disabled={busy || reason.trim().length < 3} onClick={updateAdmin}>{busy ? "Saving…" : "Save changes"}</button></div></>}</Modal>
  </AdminShell>;
}
