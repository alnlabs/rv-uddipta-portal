import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type NoteMessage = {
  id: number
  noteId: number
  body: string
  fromOffice: boolean
  authorName: string
};

export async function loadNoteThreads(noteIds: number[]) {
  const threads = new Map<number, NoteMessage[]>();
  if (!noteIds.length) return threads;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("note_messages")
      .select("id, note_id, body, from_office, author_name")
      .in("note_id", noteIds)
      .order("created_at");
    if (error || !data) return threads;
    for (const row of data) {
      const noteId = Number(row.note_id);
      const list = threads.get(noteId) ?? [];
      list.push({
        id: Number(row.id),
        noteId,
        body: String(row.body),
        fromOffice: Boolean(row.from_office),
        authorName: String(row.author_name || (row.from_office ? "Office" : "Home")),
      });
      threads.set(noteId, list);
    }
  } catch {
    return threads;
  }
  return threads;
}
