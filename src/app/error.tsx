"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main className="grid min-h-screen place-items-center p-6"><section className="panel max-w-lg p-8 text-center"><h1 className="text-2xl font-black text-[#032e4d]">The admin interface hit a problem</h1><p className="mt-3 text-sm leading-6 text-[#607282]">The error was recorded without user question or answer content.</p><button className="button-primary mt-6" onClick={reset}>Try again</button></section></main>;
}
