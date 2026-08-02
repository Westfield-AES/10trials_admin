"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  MailCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  GoogleAdminSignIn,
  googleAdminSignInConfigured,
} from "@/components/google-admin-sign-in";
import { useAdminAuth } from "@/components/providers";
import { Logo, Spinner } from "@/components/ui";
import { signInErrorMessage, type UserErrorMessage } from "@/lib/user-errors";

function secondsUntil(value: string, now: number) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.max(Math.ceil((time - now) / 1000), 0) : 0;
}

function timeLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function ErrorMessage({ error }: { error: UserErrorMessage | null }) {
  if (!error) return null;
  return (
    <div
      className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="mt-0.5 shrink-0" size={19} />
      <div>
        <p className="text-sm font-black">{error.title}</p>
        <p className="mt-1 text-sm leading-5 text-red-800">{error.message}</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const {
    user,
    admin,
    loading,
    challenge,
    startPasswordLogin,
    startGoogleLogin,
    verifyOtp,
    resendOtp,
    cancelChallenge,
  } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UserErrorMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const googleConfigured = googleAdminSignInConfigured();

  useEffect(() => {
    if (!loading && user && admin) router.replace(search.get("next") || "/");
  }, [admin, loading, router, search, user]);

  useEffect(() => {
    if (!challenge) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [challenge]);

  const expiresIn = challenge ? secondsUntil(challenge.expires_at, now) : 0;
  const resendIn = challenge ? secondsUntil(challenge.resend_available_at, now) : 0;
  const expired = Boolean(challenge) && expiresIn === 0;

  async function emailSignIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await startPasswordLogin(email.trim(), password);
      setPassword("");
      setCode("");
    } catch (nextError) {
      setError(signInErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn(credential: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await startGoogleLogin(credential);
      setCode("");
    } catch (nextError) {
      setError(signInErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || expired) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await verifyOtp(code);
      router.replace(search.get("next") || "/");
    } catch (nextError) {
      setError(signInErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function sendAnotherCode() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resendOtp();
      setCode("");
      setNotice("A new verification code has been sent.");
    } catch (nextError) {
      setError(signInErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function returnToSignIn() {
    cancelChallenge();
    setCode("");
    setError(null);
    setNotice(null);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden overflow-hidden bg-[#032e4d] p-12 text-white lg:flex lg:flex-col">
        <Logo href="/login" inverse />
        <div className="my-auto max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff9b52]">
            Internal operations
          </p>
          <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-[-0.055em]">
            A clear view of every moving part.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[#c7d8e4]">
            Monitor learners, session quality, billing, AI spend, and platform reliability from one focused workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[#9fb8c9]">
          <LockKeyhole size={15} /> Password or Google · Email verification · Audit logging
        </div>
      </section>
      <section className="grid place-items-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><Logo href="/login" /></div>
          {challenge ? (
            <>
              <div className="mt-10 grid size-11 place-items-center rounded-xl bg-[#fff0e5] text-[#c94d00] lg:mt-0">
                <MailCheck size={22} />
              </div>
              <p className="eyebrow mt-6">Two-step verification</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#032e4d]">
                Check your email
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#607282]">
                Enter the six-digit code sent to <strong className="text-[#334b5c]">{challenge.delivery.destination}</strong>.
              </p>
              <form className="mt-8 space-y-5" onSubmit={confirmCode}>
                <label className="block">
                  <span className="field-label">Verification code</span>
                  <input
                    className="field text-center font-mono text-xl font-black tracking-[0.35em]"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    minLength={6}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    disabled={busy || expired}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-describedby="code-expiry"
                  />
                </label>
                <p id="code-expiry" className="text-center text-xs font-bold text-[#607282]">
                  {expired ? "This code has expired." : `Code expires in ${timeLabel(expiresIn)}`}
                </p>
                {notice && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900" role="status">
                    <CheckCircle2 size={18} /> {notice}
                  </div>
                )}
                <ErrorMessage error={error} />
                <button className="button-primary w-full" disabled={busy || expired || code.length !== 6}>
                  {busy ? "Verifying…" : <>Verify and continue <ArrowRight size={17} /></>}
                </button>
              </form>
              <div className="mt-5 flex flex-col items-center gap-3 text-sm">
                <button
                  type="button"
                  className="font-extrabold text-[#07436c] disabled:text-[#82919c]"
                  disabled={busy || expired || resendIn > 0}
                  onClick={sendAnotherCode}
                >
                  {resendIn > 0 ? `Send another code in ${timeLabel(resendIn)}` : "Send another code"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-bold text-[#607282] hover:text-[#032e4d]"
                  disabled={busy}
                  onClick={returnToSignIn}
                >
                  <ArrowLeft size={16} /> Return to sign-in
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow mt-10 lg:mt-0">Secure access</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#032e4d]">Welcome back</h2>
              <p className="mt-3 text-sm leading-6 text-[#607282]">
                Sign in to your separate administrator account. We’ll email a verification code before granting access.
              </p>
              <form className="mt-8 space-y-5" onSubmit={emailSignIn}>
                <label className="block">
                  <span className="field-label">Email address</span>
                  <input className="field" type="email" autoComplete="email" autoFocus required disabled={busy} value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label className="block">
                  <span className="field-label">Password</span>
                  <span className="relative block">
                    <input className="field pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={busy} value={password} onChange={(event) => setPassword(event.target.value)} />
                    <button
                      className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#607282] hover:text-[#032e4d]"
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      disabled={busy}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </span>
                </label>
                <ErrorMessage error={error} />
                <button className="button-primary w-full" disabled={busy}>
                  {busy ? "Checking your account…" : <>Continue <ArrowRight size={17} /></>}
                </button>
              </form>
              {googleConfigured && (
                <>
                  <div className="my-6 flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[#9aaab5]">
                    <span className="h-px flex-1 bg-[#dce5eb]" /> or <span className="h-px flex-1 bg-[#dce5eb]" />
                  </div>
                  <GoogleAdminSignIn
                    busy={busy}
                    onCredential={googleSignIn}
                    onUnavailable={() => setError({
                      title: "Google sign-in is unavailable",
                      message: "Use your administrator email and password, then try Google again later.",
                    })}
                  />
                </>
              )}
              <p className="mt-6 text-center text-xs leading-5 text-[#82919c]">
                Having trouble? Ask a 10Trials owner to check your separate administrator access.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner /></div>}>
      <LoginForm />
    </Suspense>
  );
}
