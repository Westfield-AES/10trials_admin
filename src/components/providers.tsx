"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, publicApiRequest } from "@/lib/api";
import {
  ADMIN_SESSION_CHANGED,
  getAdminAuthChallenge,
  getAdminSessionToken,
  setAdminAuthChallenge,
  setAdminSessionToken,
} from "@/lib/admin-session";
import type {
  AdminAuthChallenge,
  AdminProfile,
  AdminSessionResponse,
} from "@/lib/types";

interface AdminAuthState {
  user: { id: string } | null;
  admin: AdminProfile | null;
  loading: boolean;
  error: Error | null;
  challenge: AdminAuthChallenge | null;
  startPasswordLogin: (email: string, password: string) => Promise<AdminAuthChallenge>;
  startGoogleLogin: (credential: string) => Promise<AdminAuthChallenge>;
  verifyOtp: (code: string) => Promise<AdminProfile>;
  resendOtp: () => Promise<AdminAuthChallenge>;
  cancelChallenge: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<unknown>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface AdminPwaInstallState {
  canPrompt: boolean;
  ios: boolean;
  installed: boolean;
  promptInstall: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);
const AdminPwaInstallContext = createContext<AdminPwaInstallState | null>(null);

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function AdminPwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIos(isIosDevice());
      setInstalled(isStandalone());
    }, 0);

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  const value = useMemo<AdminPwaInstallState>(
    () => ({ canPrompt: Boolean(installEvent), ios, installed, promptInstall }),
    [installEvent, installed, ios, promptInstall],
  );

  return (
    <AdminPwaInstallContext.Provider value={value}>
      {children}
    </AdminPwaInstallContext.Provider>
  );
}

function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<AdminAuthChallenge | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sync = () => {
      setToken(getAdminSessionToken());
      setChallenge(getAdminAuthChallenge());
      setAuthLoading(false);
    };
    sync();
    window.addEventListener(ADMIN_SESSION_CHANGED, sync);
    return () => window.removeEventListener(ADMIN_SESSION_CHANGED, sync);
  }, []);

  const profile = useQuery({
    queryKey: ["admin-profile", token],
    queryFn: () => apiRequest<{ admin: AdminProfile }>("/api/v1/admin/me"),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  const rememberChallenge = useCallback((result: AdminAuthChallenge) => {
    setAdminAuthChallenge(result);
    setChallenge(result);
    return result;
  }, []);

  const startPasswordLogin = useCallback(async (email: string, password: string) => {
    const result = await publicApiRequest<AdminAuthChallenge>("/api/v1/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return rememberChallenge(result);
  }, [rememberChallenge]);

  const startGoogleLogin = useCallback(async (credential: string) => {
    const result = await publicApiRequest<AdminAuthChallenge>("/api/v1/admin/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    return rememberChallenge(result);
  }, [rememberChallenge]);

  const verifyOtp = useCallback(async (code: string) => {
    if (!challenge) throw new Error("No administrator verification is in progress");
    const result = await publicApiRequest<AdminSessionResponse>("/api/v1/admin/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ challenge_token: challenge.challenge_token, code }),
    });
    setAdminAuthChallenge(null);
    setChallenge(null);
    setAdminSessionToken(result.access_token);
    setToken(result.access_token);
    queryClient.setQueryData(["admin-profile", result.access_token], { admin: result.admin });
    return result.admin;
  }, [challenge, queryClient]);

  const resendOtp = useCallback(async () => {
    if (!challenge) throw new Error("No administrator verification is in progress");
    const result = await publicApiRequest<AdminAuthChallenge>("/api/v1/admin/auth/otp/resend", {
      method: "POST",
      body: JSON.stringify({ challenge_token: challenge.challenge_token }),
    });
    return rememberChallenge(result);
  }, [challenge, rememberChallenge]);

  const cancelChallenge = useCallback(() => {
    setAdminAuthChallenge(null);
    setChallenge(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAdminSessionToken()) {
        await apiRequest<void>("/api/v1/admin/auth/logout", { method: "POST" });
      }
    } finally {
      setAdminSessionToken(null);
      setAdminAuthChallenge(null);
      setToken(null);
      setChallenge(null);
      queryClient.removeQueries({ queryKey: ["admin-profile"] });
    }
  }, [queryClient]);

  const value = useMemo<AdminAuthState>(
    () => ({
      user: token ? { id: profile.data?.admin.id ?? "admin-session" } : null,
      admin: profile.data?.admin ?? null,
      loading: authLoading || (Boolean(token) && profile.isLoading),
      error: profile.error instanceof Error ? profile.error : null,
      challenge,
      startPasswordLogin,
      startGoogleLogin,
      verifyOtp,
      resendOtp,
      cancelChallenge,
      logout,
      refresh: profile.refetch,
    }),
    [
      authLoading,
      cancelChallenge,
      challenge,
      logout,
      profile.data,
      profile.error,
      profile.isLoading,
      profile.refetch,
      resendOtp,
      startGoogleLogin,
      startPasswordLogin,
      token,
      verifyOtp,
    ],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error("useAdminAuth must be used within AppProviders");
  return value;
}

export function useAdminPwaInstall() {
  const value = useContext(AdminPwaInstallContext);
  if (!value) throw new Error("useAdminPwaInstall must be used within AppProviders");
  return value;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    const registerServiceWorker = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });
    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  return (
    <QueryClientProvider client={client}>
      <AdminPwaInstallProvider>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </AdminPwaInstallProvider>
    </QueryClientProvider>
  );
}
