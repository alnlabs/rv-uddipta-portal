"use client";

import { useState } from "react";
import Link from "next/link";
import { Mark } from "@/components/Mark";
import { createClient } from "@/utils/supabase/client";

export default function GoogleLogin({
  error,
  next,
}: {
  error?: string
  next?: string
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error || "");

  async function signIn() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: next
          ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
          : `${origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setMessage(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <section className="relative grid min-h-[calc(100svh-9rem)] place-items-center overflow-hidden px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-uddiipta.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#0f172a]/55" aria-hidden />
      <div className="relative w-full max-w-lg rounded-2xl border border-[rgba(15,23,42,0.14)] bg-[#ffffff] p-4 shadow-xl md:p-6">
        <Mark size={72} alt="RV Uddiipta" />
        <h1 className="mt-4 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-tight tracking-tight text-[#0f172a]">
          Sign in
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-[#475569]">
          Use the Google account for your flat. After an admin approves you,
          you can see your home.
        </p>
        <Link href="/" className="mt-2 inline-block text-sm font-semibold text-[#2f5a48]">
          View public project details
        </Link>

        {message ? <p className="mt-4 text-[#8a2f2f]">{message}</p> : null}

        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="mt-6 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-full bg-[#1e293b] px-5 text-xl font-semibold text-[#f8fafc] disabled:opacity-65"
        >
          <span aria-hidden className="text-lg">
            G
          </span>
          {busy ? "Opening Google…" : "Sign in with Google"}
        </button>
      </div>
    </section>
  );
}
