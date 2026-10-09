"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { deleteAnnouncement, pinAnnouncement } from "@/app/actions/activity";
import {
  closePoll,
  deletePost,
  deleteReply,
  markSold,
  postFeedItem,
  reactToPost,
  replyToPost,
  rsvpEvent,
  voteOnPoll,
  type UpdateState,
} from "@/app/actions/updates";
import { DateField, FieldMessage, Form, FormAlert, TextField } from "@/components/form-ui";
import { RichTextField, RichTextView } from "@/components/RichTextField";
import {
  EMERGENCY_TOPICS,
  NOTICE_KINDS,
  POST_GROUPS,
  QUOTE_MAX,
  allowsPhoto,
  kindsInGroup,
  matchesFeedFilter,
  noticeLabel,
  postKind,
  postTypeLabel,
  type NoticeKind,
  type PostGroup,
  type PostKind,
} from "@/lib/postKinds";

const initial: UpdateState = { ok: false, message: "" };

type Reply = {
  id: number
  author_name: string
  flat_number: string | null
  body: string
  author_user_id: string
};

export type PollChoice = {
  id: number
  label: string
  votes: number
};

export type FeedNotice = {
  id: number
  title: string
  body: string | null
  created_at: string
  kind: string
  pinned: boolean
  payload: unknown
};

export type FeedSlice = "all" | "notices" | "events" | "polls" | "talk" | "neighbours" | "plans" | "emergency";

export type FeedPost = {
  id: number
  author_name: string
  flat_number: string | null
  kind?: string | null
  body: string
  author_user_id: string
  created_at: string
  imageUrl?: string | null
  startsOn?: string | null
  closedAt?: string | null
  soldAt?: string | null
  topic?: string | null
  replies: Reply[]
  reactions?: {
    helpful: number
    thanks: number
    mine: "helpful" | "thanks" | null
  }
  rsvp?: {
    count: number
    going: boolean
  } | null
  poll?: {
    options: PollChoice[]
    myVotes: number[]
    multiple: boolean
    total: number
  } | null
};

function kindName(kind: string | null | undefined, topic: string | null | undefined, labels: Record<string, string>) {
  if (kind === "emergency") return postTypeLabel(kind, topic);
  return (kind && labels[kind]) || postTypeLabel(kind, topic);
}

type ComposerKind = PostKind | NoticeKind;

const menuClass =
  "h-8 max-w-full rounded-lg border border-[rgba(15,23,42,0.16)] bg-white px-2 text-sm font-semibold text-[#0f172a]";

function Composer({
  hiddenKinds = [],
  labels = {},
  canPostFeed = true,
  canPostEvents = true,
  canPostPolls = true,
  canPostNotices = false,
}: {
  hiddenKinds?: string[]
  labels?: Record<string, string>
  canPostFeed?: boolean
  canPostEvents?: boolean
  canPostPolls?: boolean
  canPostNotices?: boolean
}) {
  const kindAllowed = (value: string) => {
    if (hiddenKinds.includes(value)) return false;
    if (value === "event" || value === "celebration") return canPostEvents;
    if (value === "poll") return canPostPolls;
    return canPostFeed;
  };
  const visibleKinds = (next: PostGroup) => kindsInGroup(next).filter((item) => kindAllowed(item.value));
  const startGroup =
    POST_GROUPS.find((option) => visibleKinds(option.value).length)?.value ??
    (canPostNotices ? "notice" : "talk");
  const startKind: ComposerKind =
    startGroup === "notice"
      ? "announcement"
      : (visibleKinds(startGroup)[0]?.value ?? "update");
  const [kind, setKind] = useState<ComposerKind>(startKind);
  const [topic, setTopic] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [stick, setStick] = useState(startKind === "announcement");
  const [state, formAction, pending] = useActionState(postFeedItem, initial);
  const noticeKind = NOTICE_KINDS.find((item) => item.value === kind);
  const spec = postKind(kind) ?? kindsInGroup("talk")[0];
  const typeGroups = [
    ...(canPostNotices
      ? [{ label: "Notices", options: NOTICE_KINDS.map((option) => ({ value: option.value, label: option.label })) }]
      : []),
    ...POST_GROUPS.map((group) => ({
      label: group.label,
      options: visibleKinds(group.value).map((option) => ({
        value: option.value,
        label: labels[option.value] || option.label,
      })),
    })).filter((group) => group.options.length),
  ];

  function chooseKind(next: ComposerKind) {
    setKind(next);
    setStick(next === "announcement");
    if (next !== "emergency") setTopic("");
  }

  function setChoice(index: number, value: string) {
    setChoices((current) => current.map((choice, i) => (i === index ? value : choice)));
  }

  if (!typeGroups.length) return null;

  return (
    <Form handled action={formAction} className="field-panel mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
          Type
          <select
            value={kind}
            onChange={(event) => chooseKind(event.target.value as ComposerKind)}
            className={menuClass}
          >
            {typeGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {kind === "emergency" ? (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
            Emergency
            <select
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={menuClass}
              required
              data-label="emergency"
              data-empty="Choose what kind of emergency this is."
              data-field="topic"
            >
              <option value="">Choose</option>
              {EMERGENCY_TOPICS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "emergency" ? <FieldMessage name="topic" /> : null}
      </div>
      <input type="hidden" name="kind" value={kind} />
      {noticeKind ? (
        <TextField label="Title" name="title" required minLength={3} placeholder="Title" />
      ) : null}
      <RichTextField
        label={noticeKind ? "Details" : spec.prompt}
        name="body"
        required={!noticeKind}
        maxLength={kind === "quote" ? QUOTE_MAX : undefined}
        placeholder={noticeKind ? "Details" : spec.prompt}
        emptyMessage={
          noticeKind
            ? "Write the details, or leave them out."
            : kind === "poll"
              ? "Write the poll question."
              : kind === "event"
                ? "Write what is happening."
                : kind === "quote"
                  ? "Write the quote."
                  : kind === "emergency"
                    ? "Write what is happening, and where."
                    : kind === "sale"
                      ? "Write what you are selling, and the price."
                      : "Write a few words before posting."
        }
      />
      {kind === "event" || kind === "celebration" || kind === "meeting" ? (
        <DateField label={kind === "meeting" ? "Meeting date" : "Date"} name="startsOn" required />
      ) : null}
      {noticeKind ? (
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-[#0f172a]">
          <input
            type="checkbox"
            name="pin"
            checked={stick}
            onChange={(event) => setStick(event.target.checked)}
            className="size-4 accent-[#1e293b]"
          />
          Stick to the top
        </label>
      ) : null}
      {allowsPhoto(kind) ? (
        <label className="grid gap-1.5">
          <span className="field-label">Photo</span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm text-[#0f172a]"
            onChange={(event) => {
              void shrinkPhotoInput(event);
            }}
          />
          <span className="field-hint">Optional. A picture helps people recognise it.</span>
        </label>
      ) : null}
      {kind === "poll" ? (
        <div className="grid gap-2">
          {choices.map((choice, index) => (
            <TextField
              key={index}
              label={`Choice ${index + 1}`}
              name="option"
              value={choice}
              maxLength={80}
              required={index < 2}
              data-empty={`Add choice ${index + 1}. A poll needs at least two choices.`}
              onChange={(event) => setChoice(index, event.target.value)}
            />
          ))}
          <div className="flex flex-wrap gap-2">
            {choices.length < 6 ? (
              <button
                type="button"
                onClick={() => setChoices((current) => [...current, ""])}
                className="btn btn-ghost"
              >
                Add a choice
              </button>
            ) : null}
            {choices.length > 2 ? (
              <button
                type="button"
                onClick={() => setChoices((current) => current.slice(0, -1))}
                className="btn btn-ghost"
              >
                Remove last
              </button>
            ) : null}
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-[#0f172a]">
            <input
              type="checkbox"
              name="multiple"
              checked={multiple}
              onChange={(event) => setMultiple(event.target.checked)}
              className="size-4 accent-[#1e293b]"
            />
            People can pick more than one
          </label>
          <p className="field-hint">
            {multiple
              ? "Someone can select every answer that fits, and tap again to remove one."
              : "Everyone picks one answer, and they can change it."}
          </p>
        </div>
      ) : null}
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Sending…" : noticeKind ? "Post" : spec.submit}
      </button>
    </Form>
  );
}

function isRecentEmergency(kind: string | null | undefined, createdAt: string) {
  if (kind !== "emergency") return false;
  const sent = new Date(createdAt).getTime();
  if (Number.isNaN(sent)) return false;
  return Date.now() - sent < 24 * 60 * 60 * 1000;
}

function formatDay(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function shrinkPhotoInput(event: ChangeEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file || file.size < 700_000) return;
  const smaller = await shrinkPhoto(file);
  const transfer = new DataTransfer();
  transfer.items.add(smaller);
  input.files = transfer.files;
}

function shrinkPhoto(file: File) {
  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file);
        },
        "image/jpeg",
        0.82,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}

function ReactionButton({
  postId,
  kind,
  count,
  active,
}: {
  readonly postId: number
  readonly kind: "helpful" | "thanks"
  readonly count: number
  readonly active: boolean
}) {
  return (
    <form action={reactToPost}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="kind" value={kind} />
      <button
        type="submit"
        className={`min-h-10 rounded-full px-3 text-sm font-semibold ${
          active ? "bg-[#1e293b] text-[#f8fafc]" : "text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
        }`}
      >
        {kind === "helpful" ? "Helpful" : "Thanks"} · {count}
      </button>
    </form>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  readonly active: boolean
  readonly onClick: () => void
  readonly children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 shrink-0 rounded-full px-2.5 text-xs font-semibold ${
        active
          ? "bg-[#1e293b] text-[#f8fafc]"
          : "text-[#0f172a] ring-1 ring-[rgba(15,23,42,0.16)]"
      }`}
    >
      {children}
    </button>
  );
}

function PollChoices({
  postId,
  poll,
  closed,
}: {
  readonly postId: number
  readonly poll: NonNullable<FeedPost["poll"]>
  readonly closed: boolean
}) {
  const [state, action, pending] = useActionState(voteOnPoll, initial);
  return (
    <div className="mt-3 grid gap-2">
      {poll.options.map((option) => {
        const share = poll.total ? Math.round((option.votes / poll.total) * 100) : 0;
        const mine = poll.myVotes.includes(option.id);
        return (
          <form key={option.id} action={action}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="optionId" value={option.id} />
            <button
              type="submit"
              disabled={pending || closed}
              className={`relative min-h-12 w-full overflow-hidden rounded-2xl text-left ring-1 ${
                mine
                  ? "ring-[#059669]"
                  : "ring-[rgba(15,23,42,0.14)]"
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 ${mine ? "bg-[rgba(5,150,105,0.35)]" : "bg-[rgba(15,23,42,0.08)]"}`}
                style={{ width: `${share}%` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-semibold text-[#0f172a]">{option.label}</span>
                <span className="shrink-0 text-sm font-semibold text-[#475569]">
                  {mine ? (poll.multiple ? "Selected · " : "Your vote · ") : ""}
                  {share}%
                </span>
              </span>
            </button>
          </form>
        );
      })}
      <p className="text-sm text-[#475569]">
        {poll.total} {poll.total === 1 ? "person" : "people"}.
        {closed
          ? " Voting is closed."
          : poll.multiple
            ? " Pick every answer that fits. Tap again to remove one."
            : " Tap a choice to vote. You can change it."}
      </p>
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
    </div>
  );
}

function ReplyBox({ postId, label = "Reply" }: { postId: number; label?: string }) {
  const [state, action, pending] = useActionState(replyToPost, initial);
  return (
    <Form handled action={action} className="mt-3">
      <input type="hidden" name="postId" value={postId} />
      <div className="flex items-center gap-2">
        <input
          name="body"
          required
          placeholder={label}
          data-label={label}
          data-empty={label === "Answer" ? "Write an answer first." : "Write a reply first."}
          className="field-control reply-line min-w-0 flex-1"
        />
        <button type="submit" disabled={pending} className="btn btn-forest reply-send shrink-0">
          {pending ? "Sending…" : label}
        </button>
      </div>
      <FieldMessage name="body" />
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
    </Form>
  );
}

function cardFace(kind: string) {
  const shell = "rounded-[1.35rem] p-4";
  switch (kind) {
    case "celebration":
      return `${shell} celebration-face shadow-[inset_0_0_0_1px_rgba(180,83,9,0.16)]`;
    case "emergency":
      return `${shell} bg-[#f8e8e4] shadow-[inset_0_0_0_1px_rgba(138,47,47,0.28)]`;
    case "alert":
      return `${shell} bg-[#fff7ed] shadow-[inset_0_0_0_1px_rgba(180,83,9,0.28)]`;
    case "question":
      return `${shell} bg-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]`;
    case "quote":
      return `${shell} bg-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]`;
    case "poll":
      return `${shell} bg-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(30,41,59,0.16)]`;
    case "giveaway":
      return `${shell} border-l-4 border-[#059669] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]`;
    case "recommendation":
      return `${shell} bg-white shadow-[inset_0_0_0_1px_rgba(5,150,105,0.4)]`;
    case "lost":
      return `${shell} border-l-4 border-[#b45309] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]`;
    case "sale":
      return `${shell} bg-white shadow-[inset_0_0_0_1px_rgba(180,83,9,0.35)]`;
    case "wanted":
      return `${shell} border border-dashed border-[rgba(15,23,42,0.28)] bg-white`;
    case "parking":
      return `${shell} bg-[#f1f5f9]`;
    case "request":
    case "feedback":
      return `${shell} bg-[#f8fafc] ring-1 ring-dashed ring-[rgba(15,23,42,0.22)]`;
    case "event":
      return `${shell} bg-white shadow-[inset_0_0_0_1px_rgba(30,41,59,0.2)]`;
    default:
      return `${shell} border-l-4 border-[#1e293b] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]`;
  }
}

function labelTone(kind: string) {
  if (kind === "emergency") return "text-[#8a2f2f]";
  if (kind === "giveaway" || kind === "recommendation") return "text-[#047857]";
  if (kind === "event" || kind === "poll" || kind === "update" || kind === "question") return "text-[#1e293b]";
  return "text-[#b45309]";
}

function noticeFace(kind: string) {
  const shell = "rounded-[1.35rem] p-4";
  if (kind === "maintenance") return `${shell} bg-[#fff7ed] shadow-[inset_0_0_0_1px_rgba(180,83,9,0.28)]`;
  if (kind === "meeting") return `${shell} bg-white shadow-[inset_0_0_0_1px_rgba(30,41,59,0.2)]`;
  return `${shell} border-l-4 border-[#059669] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]`;
}

function PostEntry({
  post,
  userId,
  canModerate,
  canWrite,
  canPostEvents,
  canPostPolls,
  labels,
}: {
  post: FeedPost
  userId: string
  canModerate: boolean
  canWrite: boolean
  canPostEvents: boolean
  canPostPolls: boolean
  labels: Record<string, string>
}) {
  const kind = post.kind || "update";
  const title = post.soldAt ? "Sold" : post.closedAt ? "Closed" : kindName(post.kind, post.topic, labels);
  const who = `${post.author_name}${post.flat_number ? ` · ${post.flat_number}` : ""}`;
  const social = !["poll", "emergency", "request", "feedback", "quote"].includes(kind);
  const replyLabel = kind === "question" ? "Answer" : "Reply";
  const cardClass = cardFace(kind);
  const heading =
    kind === "poll"
      ? post.closedAt
        ? "Closed poll"
        : post.poll?.multiple
          ? "Poll · more than one answer"
          : "Poll"
      : (kind === "event" || kind === "celebration") && post.startsOn
        ? `${title} · ${formatDay(post.startsOn)}`
        : title;

  const reactions = social ? (
    <div className="mt-3 flex flex-wrap gap-2">
      {canWrite ? (
        <>
          <ReactionButton postId={post.id} kind="helpful" count={post.reactions?.helpful ?? 0} active={post.reactions?.mine === "helpful"} />
          <ReactionButton postId={post.id} kind="thanks" count={post.reactions?.thanks ?? 0} active={post.reactions?.mine === "thanks"} />
        </>
      ) : (
        <p className="text-sm text-[#475569]">
          Helpful {post.reactions?.helpful ?? 0} · Thanks {post.reactions?.thanks ?? 0}
        </p>
      )}
    </div>
  ) : null;

  const manage = (
    <div className="mt-2 flex flex-wrap gap-4">
      {canWrite && kind === "poll" && !post.closedAt && (post.author_user_id === userId || canModerate) ? (
        <form action={closePoll}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="text-sm font-semibold text-[#1e293b]">
            Close poll
          </button>
        </form>
      ) : null}
      {canWrite && kind === "sale" && !post.soldAt && (post.author_user_id === userId || canModerate) ? (
        <form action={markSold}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="text-sm font-semibold text-[#1e293b]">
            Mark sold
          </button>
        </form>
      ) : null}
      {canWrite && (post.author_user_id === userId || canModerate) ? (
        <form action={deletePost}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">
            Delete
          </button>
        </form>
      ) : null}
    </div>
  );

  const thread = (
    <>
      {post.replies.length ? (
        <ul className={`mt-3 space-y-2 border-l pl-3 ${kind === "question" ? "border-[#1e293b]" : "border-[rgba(15,23,42,0.12)]"}`}>
          {kind === "question" ? <li className="text-xs font-semibold tracking-wide text-[#475569] uppercase">Answers</li> : null}
          {post.replies.map((reply) => (
            <li key={reply.id}>
              <p className="text-sm font-semibold text-[#475569]">
                {reply.author_name}
                {reply.flat_number ? ` · ${reply.flat_number}` : ""}
              </p>
              <p className="text-base text-[#0f172a]">{reply.body}</p>
              {canWrite && (reply.author_user_id === userId || canModerate) ? (
                <form action={deleteReply}>
                  <input type="hidden" name="replyId" value={reply.id} />
                  <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canWrite && kind !== "poll" ? <ReplyBox postId={post.id} label={replyLabel} /> : null}
    </>
  );

  return (
    <li className={cardClass}>
      <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${labelTone(kind)}`}>
        {heading}
      </p>
      {kind === "quote" ? (
        <>
          <RichTextView text={post.body} className="mt-2 border-l-2 border-[#b45309] pl-3 text-lg leading-snug text-[#0f172a]" />
          <p className="mt-2 text-sm font-semibold text-[#475569]">— {who}</p>
        </>
      ) : (
        <>
          {kind === "request" || kind === "feedback" ? (
            <p className="mt-1 text-sm text-[#475569]">Only the office sees this.</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-[#475569]">{who}</p>
          <RichTextView text={post.body} className="mt-1 text-base text-[#0f172a]" />
        </>
      )}
      {kind === "poll" && post.poll ? (
        <PollChoices postId={post.id} poll={post.poll} closed={Boolean(post.closedAt) || !canPostPolls} />
      ) : null}
      {post.imageUrl ? (
        <img
          src={post.imageUrl}
          alt=""
          className={`mt-3 max-h-64 w-full rounded-2xl object-cover ${post.soldAt ? "opacity-60" : ""}`}
        />
      ) : null}
      {kind === "event" && post.rsvp ? (
        canPostEvents ? (
          <form action={rsvpEvent} className="mt-3">
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className="btn btn-forest">
              {post.rsvp.going ? "You're coming" : "I'm coming"} · {post.rsvp.count}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-[#475569]">
            {post.rsvp.going ? "You're coming" : "Going"} · {post.rsvp.count}
          </p>
        )
      ) : null}
      {reactions}
      {manage}
      {thread}
    </li>
  );
}

function noticeDate(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("startsOn" in payload)) return null;
  const value = (payload as { startsOn?: unknown }).startsOn;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function meetingDay(payload: unknown) {
  const value = noticeDate(payload);
  return value ? formatDay(value) : null;
}

export function UpdatesBoard({
  posts,
  notices = [],
  userId,
  canModerate,
  canWrite = true,
  canPostFeed = true,
  canPostEvents = true,
  canPostPolls = true,
  canPostNotices = false,
  showNotices = true,
  showEvents = true,
  showPolls = true,
  showFeed = true,
  initialSlice = "all",
  hiddenKinds = [],
  labels = {},
}: {
  posts: FeedPost[]
  notices?: FeedNotice[]
  userId: string
  canModerate: boolean
  canWrite?: boolean
  canPostFeed?: boolean
  canPostEvents?: boolean
  canPostPolls?: boolean
  canPostNotices?: boolean
  showNotices?: boolean
  showEvents?: boolean
  showPolls?: boolean
  showFeed?: boolean
  initialSlice?: FeedSlice
  hiddenKinds?: string[]
  labels?: Record<string, string>
}) {
  const [slice, setSlice] = useState<FeedSlice>(initialSlice);
  const slices = (
    [
      ["all", "All"],
      ["notices", "Notices"],
      ["events", "Events"],
      ["polls", "Polls"],
      ["talk", "Talk"],
      ["neighbours", "Neighbours"],
      ["plans", "Plans"],
      ["emergency", "Emergency"],
    ] as const
  ).filter(([id]) => {
    if (id === "notices") return showNotices;
    if (id === "events") return showEvents;
    if (id === "polls") return showPolls;
    if (id === "talk" || id === "neighbours" || id === "plans" || id === "emergency") return showFeed;
    return true;
  });
  const activeSlice = slices.some(([id]) => id === slice) ? slice : "all";
  const recentEmergencies = posts.filter((post) => isRecentEmergency(post.kind, post.created_at));
  const visible = posts.filter((post) => {
    if (post.kind === "event" && !showEvents) return false;
    if (post.kind === "poll" && !showPolls) return false;
    if (!showFeed && post.kind !== "event" && post.kind !== "poll") return false;
    if (activeSlice === "events") return post.kind === "event";
    if (activeSlice === "polls") return post.kind === "poll";
    if (activeSlice === "notices") return false;
    if (activeSlice === "talk" || activeSlice === "neighbours" || activeSlice === "plans" || activeSlice === "emergency") {
      return matchesFeedFilter(post.kind, activeSlice);
    }
    return true;
  });
  const visibleNotices = activeSlice === "all" || activeSlice === "notices" ? notices : [];
  const canPost = canPostFeed || canPostEvents || canPostPolls || canPostNotices;

  return (
    <div>
      {recentEmergencies.length && activeSlice !== "notices" ? (
        <section className="mt-5 rounded-[1.35rem] bg-[#f8e8e4] p-4 ring-1 ring-[rgba(138,47,47,0.28)]">
          <h2 className="text-sm font-semibold tracking-wide text-[#8a2f2f] uppercase">
            Emergencies in the last 24 hours
          </h2>
          <ul className="mt-3 grid gap-3">
            {recentEmergencies.map((post) => (
              <li key={post.id}>
                <p className="font-semibold text-[#6d2424]">
                  {kindName(post.kind, post.topic, labels)}
                  {post.flat_number ? ` · ${post.flat_number}` : ""}
                  {post.author_name ? ` · ${post.author_name}` : ""}
                </p>
                <RichTextView text={post.body} className="mt-1 text-[#3d2420]" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canPost ? (
        <Composer
          hiddenKinds={hiddenKinds}
          labels={labels}
          canPostFeed={canPostFeed}
          canPostEvents={canPostEvents}
          canPostPolls={canPostPolls}
          canPostNotices={canPostNotices}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {slices.map(([id, label]) => (
          <FilterChip key={id} active={activeSlice === id} onClick={() => setSlice(id)}>
            {label}
          </FilterChip>
        ))}
      </div>

      {visibleNotices.length ? (
        <ul className="mt-6 grid gap-3">
          {visibleNotices.map((notice) => {
            const when = meetingDay(notice.payload);
            return (
            <li
              key={notice.id}
              className={noticeFace(notice.kind)}
            >
              <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${notice.kind === "announcement" || notice.kind === "builder_update" ? "text-[#047857]" : notice.kind === "meeting" ? "text-[#1e293b]" : "text-[#b45309]"}`}>
                {notice.pinned ? "At the top · " : ""}
                {noticeLabel(notice.kind)}
                {when ? ` · ${when}` : ""}
              </p>
              <p className="mt-1 text-lg font-semibold text-[#0f172a]">{notice.title}</p>
              {notice.body ? <RichTextView text={notice.body} className="mt-1 text-[#475569]" /> : null}
              {canModerate ? (
                <div className="mt-2 flex gap-4">
                  <form action={pinAnnouncement}>
                    <input type="hidden" name="id" value={notice.id} />
                    <input type="hidden" name="pinned" value={notice.pinned ? "false" : "true"} />
                    <button type="submit" className="text-sm font-semibold text-[#1e293b]">
                        {notice.pinned ? "Unstick" : "Stick to the top"}
                    </button>
                  </form>
                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={notice.id} />
                    <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">
                      Remove
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
            );
          })}
        </ul>
      ) : activeSlice === "notices" ? (
        <p className="py-6 text-[#475569]">No notices yet.</p>
      ) : null}

      {activeSlice === "notices" ? null : (
      <ul className="mt-4 grid gap-3">
        {visible.length === 0 ? (
          <li className="py-6 text-[#475569]">
            {activeSlice === "all"
              ? "No posts yet."
              : `Nothing in ${slices.find(([id]) => id === activeSlice)?.[1] ?? "this list"} yet.`}
          </li>
        ) : (
          visible.map((post) => (
            <PostEntry
              key={post.id}
              post={post}
              userId={userId}
              canModerate={canModerate}
              canWrite={canWrite}
              canPostEvents={canPostEvents}
              canPostPolls={canPostPolls}
              labels={labels}
            />
          ))
        )}
      </ul>
      )}
    </div>
  );
}
