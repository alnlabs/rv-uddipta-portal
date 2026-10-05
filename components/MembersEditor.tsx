"use client";

import { useRef, useState } from "react";
import { Form, FormAlert, TextField } from "@/components/form-ui";
import ProfileAvatar from "@/components/ProfileAvatar";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { cleanError } from "@/lib/auth";
import { mapFlatMember } from "@/lib/flats";
import { normalizePhone } from "@/lib/phone";
import {
  PROFILE_PHOTO_ACCEPT,
  removeProfilePhotoObject,
  uploadProfilePhoto,
} from "@/lib/profilePhoto";
import {
  MEMBER_RELATIONS,
  relationLabel,
  type MemberRelation,
} from "@/lib/status";
import type { FlatMember } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

type Draft = {
  name: string;
  relation: MemberRelation;
  phone: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  relation: "spouse",
  phone: "",
});

function RelationChips({
  value,
  onChange,
  name,
}: {
  value: MemberRelation
  onChange: (next: MemberRelation) => void
  name: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Relation">
      {MEMBER_RELATIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold ${
                selected
                  ? "bg-[#1b3a2f] text-[#e8d5a3]"
                  : "bg-[rgba(27,58,47,0.06)] text-[#3d5247] ring-1 ring-[rgba(27,58,47,0.1)]"
              }`}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function MembersEditor({
  flatId,
  initialMembers,
  presentation = "card",
}: {
  flatId: number
  initialMembers: FlatMember[]
  presentation?: "card" | "stage"
}) {
  const [members, setMembers] = useState(initialMembers);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [draftPhoto, setDraftPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(initialMembers.length === 0);
  void presentation;

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const name = draft.name.trim();
      if (name.length < 2) {
        throw new Error("Enter a member name (at least 2 characters).");
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
        .from("flat_members")
        .insert({
          flat_id: flatId,
          name,
          relation: draft.relation,
          phone,
          sort_order: members.length,
        })
        .select()
        .single();
      if (insertError) throw new Error(cleanError(insertError.message));
      let mapped = mapFlatMember(data);
      if (!mapped) throw new Error("Could not save member.");

      if (draftPhoto) {
        const url = await uploadProfilePhoto(
          supabase,
          draftPhoto,
          flatId,
          "member",
          mapped.id,
        );
        const { data: updated, error: photoError } = await supabase
          .from("flat_members")
          .update({ photo_url: url })
          .eq("id", mapped.id)
          .select()
          .single();
        if (photoError) throw new Error(cleanError(photoError.message));
        mapped = mapFlatMember(updated) ?? { ...mapped, photoUrl: url };
      }

      setMembers((prev) => [...prev, mapped]);
      setDraft(emptyDraft());
      setDraftPhoto(null);
      setOpenAdd(false);
      setMessage("Member added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
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
        throw new Error("Enter a member name (at least 2 characters).");
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
        .from("flat_members")
        .update({
          name,
          relation: editDraft.relation,
          phone,
        })
        .eq("id", editingId)
        .select()
        .single();
      if (updateError) throw new Error(cleanError(updateError.message));
      const mapped = mapFlatMember(data);
      if (mapped) {
        setMembers((prev) =>
          prev.map((member) => (member.id === mapped.id ? mapped : member)),
        );
      }
      setEditingId(null);
      setMessage("Member updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update member");
    } finally {
      setBusy(false);
    }
  }

  async function saveMemberPhoto(memberId: number, nextUrl: string | null) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("flat_members")
      .update({ photo_url: nextUrl })
      .eq("id", memberId)
      .select()
      .single();
    if (updateError) throw new Error(cleanError(updateError.message));
    const mapped = mapFlatMember(data);
    if (mapped) {
      setMembers((prev) =>
        prev.map((member) => (member.id === mapped.id ? mapped : member)),
      );
    }
  }

  async function removeMember(id: number, name: string) {
    if (!window.confirm(`Remove ${name} from this flat?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const existing = members.find((member) => member.id === id);
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("flat_members")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(cleanError(deleteError.message));
      if (existing?.photoUrl) {
        await removeProfilePhotoObject(supabase, existing.photoUrl);
      }
      setMembers((prev) => prev.filter((member) => member.id !== id));
      if (editingId === id) setEditingId(null);
      setMessage("Member removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(member: FlatMember) {
    setEditingId(member.id);
    setEditDraft({
      name: member.name,
      relation: (MEMBER_RELATIONS.some((item) => item.value === member.relation)
        ? member.relation
        : "other") as MemberRelation,
      phone: member.phone ?? "",
    });
    setOpenAdd(false);
    setError("");
    setMessage("");
  }

  return (
    <section className="field-panel text-[#14241c]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(27,58,47,0.08)] pb-3">
        <div>
          <p className="eyebrow">Profile</p>
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
            Members
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#3d5247]">
            Add photos and details for family members. They show on the
            community Members directory.
          </p>
        </div>
        <span className="inline-flex min-h-10 items-center rounded-full bg-[#1b3a2f] px-4 text-sm font-bold text-[#e8d5a3]">
          {members.length} {members.length === 1 ? "person" : "people"}
        </span>
      </div>

      {members.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[rgba(27,58,47,0.18)] px-4 py-10 text-center">
          <p className="text-base font-semibold text-[#14241c]">No members yet</p>
          <p className="mt-1 text-sm text-[#3d5247]">
            Start with spouse, children, or parents.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {members.map((member) =>
            editingId === member.id ? (
              <li
                key={member.id}
                className="rounded-2xl bg-[rgba(27,58,47,0.04)] p-4 ring-1 ring-[rgba(27,58,47,0.1)] sm:col-span-2"
              >
                <Form onSubmit={saveEdit} className="space-y-3">
                  <ProfilePhotoPicker
                    name={editDraft.name || member.name}
                    photoUrl={member.photoUrl}
                    flatId={flatId}
                    kind="member"
                    memberId={member.id}
                    tone="member"
                    size="md"
                    onChange={(nextUrl) => {
                      void saveMemberPhoto(member.id, nextUrl).catch((err) => {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Could not update photo",
                        );
                      });
                    }}
                  />
                  <TextField
                    label="Name"
                    name="name"
                    type="text"
                    value={editDraft.name}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                    minLength={2}
                  />
                  <div>
                    <p className="mb-1.5 text-sm font-semibold">Relation</p>
                    <RelationChips
                      name={`edit-relation-${member.id}`}
                      value={editDraft.relation}
                      onChange={(relation) =>
                        setEditDraft((prev) => ({ ...prev, relation }))
                      }
                    />
                  </div>
                  <TextField
                    label="Phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={editDraft.phone}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="submit" disabled={busy} className="btn btn-forest">
                      {busy ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      className="btn btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </Form>
              </li>
            ) : (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-2xl bg-[rgba(27,58,47,0.04)] px-3.5 py-3"
              >
                <ProfileAvatar
                  name={member.name}
                  photoUrl={member.photoUrl}
                  tone="member"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{member.name}</p>
                  <p className="truncate text-sm text-[#3d5247]">
                    {relationLabel(member.relation)}
                    {member.phone ? ` · ${member.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(member)}
                    className="min-h-9 rounded-full px-3 text-sm font-semibold text-[#2f5a48] disabled:opacity-65"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeMember(member.id, member.name)}
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
          <Form
          onSubmit={addMember}
          className="mt-6 space-y-3 rounded-2xl bg-[rgba(27,58,47,0.04)] p-4 ring-1 ring-[rgba(27,58,47,0.08)]"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
              Add member
            </p>
            {members.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpenAdd(false);
                  setDraftPhoto(null);
                }}
                className="text-xs font-semibold text-[#3d5247] hover:underline"
              >
                Close
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Photo</span>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="btn btn-forest w-fit"
            >
              Choose photo
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept={PROFILE_PHOTO_ACCEPT}
              onChange={(e) => setDraftPhoto(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {draftPhoto ? (
              <span className="text-xs font-normal text-[#2f5a48]">
                {draftPhoto.name}
              </span>
            ) : (
              <span className="text-xs font-normal text-[#3d5247]">
                Optional · JPEG, PNG, WebP or GIF · max 5 MB
              </span>
            )}
          </div>
          <TextField
            label="Name"
            name="name"
            type="text"
            value={draft.name}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value }))
            }
            required
            minLength={2}
            placeholder="Full name"
            autoComplete="name"
          />
          <div>
            <p className="mb-1.5 text-sm font-semibold">Relation</p>
            <RelationChips
              name="add-relation"
              value={draft.relation}
              onChange={(relation) =>
                setDraft((prev) => ({ ...prev, relation }))
              }
            />
          </div>
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            value={draft.phone}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="Optional 10-digit mobile"
          />
          <button type="submit" disabled={busy} className="btn btn-forest w-full">
            {busy ? "Saving…" : "Add member"}
          </button>
        </Form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpenAdd(true);
            setEditingId(null);
          }}
          className="mt-6 min-h-12 w-full rounded-full border border-dashed border-[rgba(27,58,47,0.28)] text-sm font-semibold text-[#1b3a2f] hover:bg-[rgba(27,58,47,0.04)]"
        >
          + Add member
        </button>
      )}

      {error ? (
        <div className="mt-4">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
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
