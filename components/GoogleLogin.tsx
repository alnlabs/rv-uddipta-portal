"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function GoogleLogin({ error }: { error?: string }) {
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
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setMessage(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <section className="page-gutter grid max-w-[1100px] place-items-start py-6 md:min-h-[70vh] md:place-items-center md:py-12">
      <div className="w-full max-w-lg rounded-2xl border border-[rgba(27,58,47,0.14)] bg-[#fffcf5] p-4 shadow-xl md:p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Owner access
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Sign in with Google
        </h1>
        <p className="mt-3 text-[#3d5247]">
          Use your Google account. Brochure flats, amenities, and sizes are
          already on the home page. An admin must approve you before you can
          see owner information.
        </p>
        <Link href="/" className="mt-2 inline-block text-sm font-semibold text-[#2f5a48]">
          View public project details
        </Link>

        {message ? <p className="mt-4 text-[#8a2f2f]">{message}</p> : null}

        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#1b3a2f] px-5 font-semibold text-[#e8d5a3] disabled:opacity-65"
        >
          <span aria-hidden className="text-lg">
            G
          </span>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
      </div>
    </section>
  );
}
