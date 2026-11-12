"use client";

import { useMemo, useState } from "react";
import { passShareMessage, passShareUrl, whatsappShareUrl } from "@/lib/passShare";

export function PassShare({
  code,
  visitorName,
  home,
  date,
  phone,
}: {
  readonly code: string
  readonly visitorName: string
  readonly home: string
  readonly date?: string
  readonly phone?: string | null
}) {
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => passShareUrl(code), [code]);
  const message = useMemo(
    () => passShareMessage({ code, visitorName, home, date }),
    [code, visitorName, home, date],
  );
  const wa = useMemo(() => whatsappShareUrl(message, phone), [message, phone]);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-slate"
        onClick={() => {
          void navigator.clipboard.writeText(message).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        className="btn-line"
        href={wa}
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <a
        className="btn-line"
        href={link}
        target="_blank"
        rel="noreferrer"
      >
        Open pass
      </a>
    </div>
  );
}
