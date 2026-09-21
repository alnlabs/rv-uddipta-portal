"use client";

import { useState } from "react";
import { cleanError } from "@/lib/auth";
import { mapFlatRenter } from "@/lib/flats";
import { normalizePhone } from "@/lib/phone";
import type { FlatRenter } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type Draft = {
  name: string;
  phone: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  phone: "",
  startDate: "",
  endDate: "",
  notes: "",
});

function dateInput(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function formatDisplayDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function periodLabel(renter: FlatRenter) {
  const start = formatDisplayDate(renter.startDate);
  const end = formatDisplayDate(renter.endDate);
  if (start && end) return `${start} → ${end}`;
  if (start && !end) return `${start} → present`;
  if (!start && end) return `until ${end}`;
  return "Dates not set";
}

async function syncTenantFields(flatId: number, list: FlatRenter[]) {
  const current = list.find((item) => !item.endDate) ?? null;
  const supabase = createClient();
  await supabase
    .from("flats")
    .update({
      tenant_name: current?.name ?? null,
      tenant_phone: current?.phone ?? null,
    })
    .eq("id", flatId);
}

export default function RentersEditor({
  flatId,
  initialRenters,
  presentation = "card",
}: {
  flatId: number
  initialRenters: FlatRenter[]
  presentation?: "card" | "stage"
}) {
  const [renters, setRenters] = useState(initialRenters);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(initialRenters.length === 0);
  const stage = presentation === "stage";

  async function addRenter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const name = draft.name.trim();
      if (name.length < 2) {
        throw new Error("Enter a renter name (at least 2 characters).");
      }
      if (draft.endDate && draft.startDate && draft.endDate < draft.startDate) {
        throw new Error("End date must be on or after the start date.");
      }
      let phone: string | null = null;
      if (draft.phone.trim()) {
        phone = normalizePhone(draft.phone);
        if (!phone) {
          throw new Error("Enter a valid 10-digit phone, or leave it blank.");
        }
      }
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("flat_renters")
        .insert({
          flat_id: flatId,
          name,
          phone,
          start_date: draft.startDate || null,
          end_date: draft.endDate || null,
          notes: draft.notes.trim() || null,
          sort_order: renters.length,
        })
        .select()
        .single();
      if (insertError) throw new Error(cleanError(insertError.message));
      const mapped = mapFlatRenter(data);
      if (!mapped) throw new Error("Could not save renter.");
      const next = [...renters, mapped];
      setRenters(next);
      await syncTenantFields(flatId, next);
      setDraft(emptyDraft());
      setOpenAdd(false);
      setMessage("Renter added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add renter");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const name = editDraft.name.trim();
      if (name.length < 2) {
        throw new Error("Enter a renter name (at least 2 characters).");
      }
      if (
        editDraft.endDate &&
        editDraft.startDate &&
        editDraft.endDate < editDraft.startDate
      ) {
        throw new Error("End date must be on or after the start date.");
      }
      let phone: string | null = null;
      if (editDraft.phone.trim()) {
        phone = normalizePhone(editDraft.phone);
        if (!phone) {
          throw new Error("Enter a valid 10-digit phone, or leave it blank.");
        }
      }
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("flat_renters")
        .update({
          name,
          phone,
          start_date: editDraft.startDate || null,
          end_date: editDraft.endDate || null,
          notes: editDraft.notes.trim() || null,
        })
        .eq("id", editingId)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const mapped = mapFlatRenter(data);
      if (!mapped) throw new Error("Could not update renter.");
      const next = renters.map((item) =>
        item.id === mapped.id ? mapped : item,
      );
      setRenters(next);
      await syncTenantFields(flatId, next);
      setEditingId(null);
      setMessage("Renter updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update renter");
    } finally {
      setBusy(false);
    }
  }

  async function removeRenter(id: number, name: string) {
    if (!window.confirm(`Remove ${name} from this flat’s renter history?`)) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("flat_renters")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(cleanError(deleteError.message));
      const next = renters.filter((item) => item.id !== id);
      setRenters(next);
      await syncTenantFields(flatId, next);
      if (editingId === id) setEditingId(null);
      setMessage("Renter removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove renter");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(renter: FlatRenter) {
    setEditingId(renter.id);
    setEditDraft({
      name: renter.name,
      phone: renter.phone ?? "",
      startDate: dateInput(renter.startDate),
      endDate: dateInput(renter.endDate),
      notes: renter.notes ?? "",
    });
    setOpenAdd(false);
    setError("");
    setMessage("");
  }

  function draftFields(
    value: Draft,
    onChange: (next: Draft) => void,
  ) {
    return (
      <>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Name
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            required
            minLength={2}
            className="min-h-11 rounded-xl border border-[rgba(27,58,47,0.12)] bg-white px-3 py-2 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Phone
          <input
            type="tel"
            inputMode="numeric"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="Optional"
            className="min-h-11 rounded-xl border border-[rgba(27,58,47,0.12)] bg-white px-3 py-2 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Start date
            <input
              type="date"
              value={value.startDate}
              onChange={(e) =>
                onChange({ ...value, startDate: e.target.value })
              }
              className="min-h-11 rounded-xl border border-[rgba(27,58,47,0.12)] bg-white px-3 py-2 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            End date
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              className="min-h-11 rounded-xl border border-[rgba(27,58,47,0.12)] bg-white px-3 py-2 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Notes
          <input
            type="text"
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder="Optional"
            className="min-h-11 rounded-xl border border-[rgba(27,58,47,0.12)] bg-white px-3 py-2 text-base font-normal outline-none focus:border-[#1b3a2f] focus:ring-2 focus:ring-[rgba(27,58,47,0.12)]"
          />
        </label>
      </>
    );
  }

  return (
    <section
      className={
        stage
          ? "rounded-[1.75rem] bg-[#fffcf5] p-5 text-[#14241c] shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-8"
          : "rounded-3xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5]/95 p-5 shadow-lg md:p-6"
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <div>
          <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
            Profile
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Renters
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#3d5247]">
            Keep a history of tenants with start and end dates. The current
            renter (no end date) shows on the community board.
          </p>
        </div>
        <span className="inline-flex min-h-10 items-center rounded-full bg-[#1b3a2f] px-4 text-sm font-bold text-[#e8d5a3]">
          {renters.length} {renters.length === 1 ? "renter" : "renters"}
        </span>
      </div>

      {renters.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[rgba(27,58,47,0.18)] px-4 py-10 text-center">
          <p className="text-base font-semibold text-[#14241c]">No renters yet</p>
          <p className="mt-1 text-sm text-[#3d5247]">
            Add the current tenant with a start date.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {renters.map((renter) =>
            editingId === renter.id ? (
              <li
                key={renter.id}
                className="rounded-2xl bg-[rgba(27,58,47,0.04)] p-4 ring-1 ring-[rgba(27,58,47,0.1)] sm:col-span-2"
              >
                <form onSubmit={saveEdit} className="space-y-3">
                  {draftFields(editDraft, setEditDraft)}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="min-h-10 rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3] disabled:opacity-65"
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#3d5247]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={renter.id}
                className="flex items-center gap-3 rounded-2xl bg-[rgba(27,58,47,0.04)] px-3.5 py-3"
              >
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-[#9a5b3c] text-sm font-bold tracking-wide text-[#fffcf5]"
                  aria-hidden
                >
                  {initials(renter.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">
                    {renter.name}
                    {!renter.endDate ? (
                      <span className="ml-2 rounded-full bg-[rgba(154,91,60,0.16)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#6d3a22] uppercase">
                        Current
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-[#3d5247]">
                    {periodLabel(renter)}
                    {renter.phone ? ` · ${renter.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(renter)}
                    className="min-h-9 rounded-full px-3 text-sm font-semibold text-[#2f5a48] disabled:opacity-65"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeRenter(renter.id, renter.name)}
                    className="min-h-9 rounded-full px-3 text-sm font-semibold text-[#8a2f2f] disabled:opacity-65"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {openAdd ? (
        <form
          onSubmit={addRenter}
          className="mt-6 space-y-3 rounded-2xl bg-[rgba(27,58,47,0.04)] p-4 ring-1 ring-[rgba(27,58,47,0.08)]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
              Add renter
            </p>
            {renters.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpenAdd(false)}
                className="text-xs font-semibold text-[#3d5247] hover:underline"
              >
                Close
              </button>
            ) : null}
          </div>
          {draftFields(draft, setDraft)}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3] disabled:opacity-65"
          >
            {busy ? "Saving…" : "Add renter"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpenAdd(true);
            setEditingId(null);
          }}
          className="mt-6 min-h-12 w-full rounded-full border border-dashed border-[rgba(27,58,47,0.28)] text-sm font-semibold text-[#1b3a2f] hover:bg-[rgba(27,58,47,0.04)]"
        >
          + Add renter
        </button>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-[rgba(138,47,47,0.08)] px-4 py-3 text-sm text-[#8a2f2f]"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-[rgba(47,90,72,0.1)] px-4 py-3 text-sm font-semibold text-[#2f5a48]"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
