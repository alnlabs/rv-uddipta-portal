"use client";

import { useState } from "react";
import { saveCategory } from "@/app/actions/community-os";

export function CategoryRow({
  id,
  label,
  enabled,
  about,
}: {
  id: number
  label: string
  enabled: boolean
  about: string
}) {
  const [renaming, setRenaming] = useState(false);

  return (
    <li className={`slab flex h-full flex-col p-4 ${enabled ? "" : "bg-[#f8fafc]"}`}>
      {renaming ? (
        <form action={saveCategory} className="flex flex-1 flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          {enabled ? <input type="hidden" name="enabled" value="on" /> : null}
          <input
            name="label"
            defaultValue={label}
            aria-label="Name"
            required
            className="field-control w-full"
            autoFocus
          />
          <div className="mt-auto flex flex-wrap gap-2">
            <button type="submit" className="btn-slate">Save</button>
            <button type="button" className="btn-line" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className={`font-semibold ${enabled ? "text-[#0f172a]" : "text-[#64748b]"}`}>{label}</p>
          <p className="mt-1 flex-1 text-sm text-[#475569]">{about}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="text-sm font-semibold text-[#1e293b] underline decoration-[#cbd5e1] underline-offset-4"
            >
              Rename
            </button>
            <form action={saveCategory} className="flex items-center gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="label" value={label} />
              {enabled ? null : <input type="hidden" name="enabled" value="on" />}
              <span className={`text-sm font-semibold ${enabled ? "text-[#047857]" : "text-[#64748b]"}`}>
                {enabled ? "Shown" : "Hidden"}
              </span>
              <button type="submit" className={enabled ? "btn-line" : "btn-slate"}>
                {enabled ? "Hide" : "Show"}
              </button>
            </form>
          </div>
        </>
      )}
    </li>
  );
}
