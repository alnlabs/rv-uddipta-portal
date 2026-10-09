"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { myRegistrationWatch } from "@/app/actions/register";

export function ApprovalWatcher() {
  const router = useRouter();
  const refreshing = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await myRegistrationWatch();
      if (cancelled || result.status !== "approved" || refreshing.current) return;
      refreshing.current = true;
      const flat = result.flatNumber ? ` for ${result.flatNumber}` : "";
      setNotice(`You're approved${flat}. Opening your home.`);
      window.setTimeout(() => {
        if (!cancelled) router.replace("/feed");
      }, 1600);
    }

    const id = window.setInterval(() => {
      void check();
    }, 4000);
    void check();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  if (!notice) return null;

  return (
    <output className="sticky top-0 z-30 block border-b border-[rgba(5,150,105,0.45)] bg-[#1e293b] px-4 py-3 text-sm font-semibold text-[#f8fafc]">
      {notice}
    </output>
  );
}
