"use client";

import {
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AdminPermission } from "@/lib/types";
import { accessErrorMessage } from "@/lib/user-errors";
import { cn, titleCase } from "@/lib/utils";
import { AdminInstallPrompt } from "@/components/admin-install-prompt";
import { useAdminAuth } from "@/components/providers";
import { Logo, Spinner } from "@/components/ui";

interface NavigationItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: AdminPermission;
}

const navigation: NavigationItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, permission: "dashboard.read" },
  { href: "/users", label: "Users", icon: Users, permission: "users.read" },
  { href: "/learning", label: "Learning", icon: BarChart3, permission: "learning.read" },
  { href: "/billing", label: "Billing", icon: CircleDollarSign, permission: "billing.read" },
  { href: "/ai-costs", label: "AI & costs", icon: BrainCircuit, permission: "ai.read" },
  { href: "/operations", label: "Operations", icon: BriefcaseBusiness, permission: "jobs.read" },
  { href: "/audit", label: "Audit log", icon: ClipboardList, permission: "audit.read" },
  { href: "/admins", label: "Administrators", icon: ShieldCheck, permission: "admins.manage" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, admin, loading, error, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, pathname, router, user]);

  const links = useMemo(
    () => navigation.filter((item) => admin?.permissions.includes(item.permission)),
    [admin],
  );

  if (loading || (!user && !error)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Verifying administrator access" />
      </div>
    );
  }

  if (user && (error || !admin)) {
    const message = accessErrorMessage(error);
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f8fa] p-6">
        <section className="panel max-w-lg p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-red-50 text-red-700">
            <ShieldCheck />
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#032e4d]">{message.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#607282]">
            {message.message}
          </p>
          <button
            className="button-primary mt-6"
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
          >
            Use another account
          </button>
        </section>
      </main>
    );
  }

  if (!admin) return null;

  const sidebar = (
    <>
      <div className="flex items-center justify-between">
        <Logo />
        <button className="rounded-lg p-2 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
          <X size={20} />
        </button>
      </div>
      <nav className="mt-9 space-y-1" aria-label="Administration navigation">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-extrabold",
                active
                  ? "bg-[#fff0e5] text-[#b94700]"
                  : "text-[#526877] hover:bg-[#f4f8fa] hover:text-[#032e4d]",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-[#dce5eb] bg-[#f8fafb] p-4">
        <div className="flex items-center gap-2 text-[#13734d]">
          <ShieldCheck size={17} />
          <span className="text-xs font-black uppercase tracking-wider">Access enforced</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#607282]">
          Backend permissions are active for the {titleCase(admin.role)} role.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#dce5eb] bg-white p-5 lg:flex">
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[#011c30]/60 lg:hidden" onMouseDown={() => setMobileOpen(false)}>
          <aside className="flex h-full w-72 flex-col bg-white p-5" onMouseDown={(event) => event.stopPropagation()}>
            {sidebar}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#dce5eb] bg-white/95 px-4 backdrop-blur lg:ml-64 lg:px-7">
        <button className="rounded-lg p-2 lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
          <Menu size={21} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <AdminInstallPrompt />
          <div className="relative">
            <button
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f8fa]"
              onClick={() => setAccountOpen((value) => !value)}
            >
              <span className="grid size-8 place-items-center rounded-full bg-[#032e4d] text-xs font-black text-white">
                {(admin.display_name || admin.email).slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:block">
                <span className="block text-sm font-black text-[#032e4d]">{admin.display_name || admin.email}</span>
                <span className="block text-[11px] font-bold text-[#607282]">{titleCase(admin.role)}</span>
              </span>
              <ChevronDown size={15} className="text-[#82919c]" />
            </button>
            {accountOpen && (
              <div className="panel absolute right-0 mt-2 w-60 p-2">
                <div className="border-b border-[#e2e9ed] px-3 py-2">
                  <p className="truncate text-xs text-[#607282]">{admin.email}</p>
                </div>
                <button
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-[#526877] hover:bg-[#f4f8fa]"
                  onClick={async () => {
                    await logout();
                    router.replace("/login");
                  }}
                >
                  <LogOut size={17} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="p-4 lg:ml-64 lg:p-7 xl:p-9">{children}</main>
    </div>
  );
}
