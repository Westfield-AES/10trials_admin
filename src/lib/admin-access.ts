import type { AdminPermission } from "@/lib/types";

export const adminRoutePermissions = {
  "/": "dashboard.read",
  "/users": "users.read",
  "/question-reports": "question_reports.read",
  "/learning": "learning.read",
  "/billing": "billing.read",
  "/ai-costs": "ai.read",
  "/operations": "jobs.read",
  "/audit": "audit.read",
  "/admins": "admins.manage",
} as const satisfies Record<string, AdminPermission>;

export function permissionForAdminPath(pathname: string): AdminPermission | null {
  const route = Object.entries(adminRoutePermissions).find(
    ([path]) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
  );
  return route?.[1] ?? null;
}
