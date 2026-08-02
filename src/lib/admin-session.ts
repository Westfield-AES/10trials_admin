import type { AdminAuthChallenge } from "@/lib/types";

const SESSION_KEY = "10trials-admin-session";
const CHALLENGE_KEY = "10trials-admin-auth-challenge";
export const ADMIN_SESSION_CHANGED = "10trials-admin-session-changed";

export function getAdminSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(SESSION_KEY);
}

export function setAdminSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(SESSION_KEY, token);
  else window.sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGED));
}

export function getAdminAuthChallenge(): AdminAuthChallenge | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(CHALLENGE_KEY);
  if (!stored) return null;
  try {
    const challenge = JSON.parse(stored) as Partial<AdminAuthChallenge>;
    if (
      typeof challenge.challenge_token !== "string" ||
      typeof challenge.expires_at !== "string" ||
      typeof challenge.resend_available_at !== "string" ||
      challenge.delivery?.channel !== "email" ||
      typeof challenge.delivery.destination !== "string"
    ) {
      throw new Error("Invalid administrator challenge");
    }
    return challenge as AdminAuthChallenge;
  } catch {
    window.sessionStorage.removeItem(CHALLENGE_KEY);
    return null;
  }
}

export function setAdminAuthChallenge(challenge: AdminAuthChallenge | null): void {
  if (typeof window === "undefined") return;
  if (challenge) window.sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
  else window.sessionStorage.removeItem(CHALLENGE_KEY);
}
