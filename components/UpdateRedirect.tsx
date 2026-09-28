"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function UpdateRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "journey" || hash === "stay" || hash === "documents") {
      router.replace(`/#${hash}`);
      return;
    }
    if (hash === "2d" || hash === "3d" || hash === "text") {
      router.replace("/#your-apartment");
      return;
    }
    router.replace("/");
  }, [router]);

  return (
    <div className="page-gutter py-16 text-sm text-[#3d5247]">
      Opening your home…
    </div>
  );
}
