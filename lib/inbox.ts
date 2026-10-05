export const MESSAGE_KINDS = ["reply", "note_reply"] as const;

export function isMessageKind(kind: string) {
  return kind === "reply" || kind === "note_reply";
}
