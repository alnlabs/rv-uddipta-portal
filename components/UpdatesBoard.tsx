"use client";

import { useActionState, useState } from "react";
import {
  deletePost,
  deleteReply,
  postUpdate,
  replyToPost,
  voteOnPoll,
  type UpdateState,
} from "@/app/actions/updates";
import { Form, FormAlert, TextAreaField, TextField } from "@/components/form-ui";
import { COMMUNITY_POST_KINDS, POST_KINDS, postKind, type PostKind } from "@/lib/postKinds";

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

export type FeedPost = {
  id: number
  author_name: string
  flat_number: string | null
  kind?: string | null
  body: string
  author_user_id: string
  created_at: string
  replies: Reply[]
  poll?: {
    options: PollChoice[]
    myVote: number | null
    total: number
  } | null
};

function Composer() {
  const [kind, setKind] = useState<PostKind>("update");
  const [choices, setChoices] = useState(["", ""]);
  const [state, formAction, pending] = useActionState(postUpdate, initial);
  const spec = postKind(kind) ?? POST_KINDS[0];

  function setChoice(index: number, value: string) {
    setChoices((current) => current.map((choice, i) => (i === index ? value : choice)));
  }

  return (
    <Form handled action={formAction} className="field-panel mt-5 grid gap-3">
      <fieldset>
        <legend className="field-label mb-2">Type</legend>
        <div className="flex flex-wrap gap-2">
          {POST_KINDS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="peer sr-only"
              />
              <span className="choice-face min-w-[7.5rem] px-3">{option.label}</span>
            </label>
          ))}
        </div>
        <p className="field-hint mt-2">
          {spec.audience === "community"
            ? "Everyone in the community sees this."
            : "Only the admin sees this."}
        </p>
      </fieldset>
      <TextAreaField
        label={spec.prompt}
        name="body"
        required
        minLength={2}
        rows={kind === "poll" ? 2 : 4}
      />
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
          <p className="field-hint">Everyone can vote once, and they can change their vote.</p>
        </div>
      ) : null}
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Sending…" : spec.submit}
      </button>
    </Form>
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
      className={`min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold ${
        active
          ? "bg-[#1b3a2f] text-[#e8d5a3]"
          : "text-[#14241c] ring-1 ring-[rgba(27,58,47,0.16)]"
      }`}
    >
      {children}
    </button>
  );
}

function PollChoices({
  postId,
  poll,
}: {
  readonly postId: number
  readonly poll: NonNullable<FeedPost["poll"]>
}) {
  const [state, action, pending] = useActionState(voteOnPoll, initial);
  return (
    <div className="mt-3 grid gap-2">
      {poll.options.map((option) => {
        const share = poll.total ? Math.round((option.votes / poll.total) * 100) : 0;
        const mine = poll.myVote === option.id;
        return (
          <form key={option.id} action={action}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="optionId" value={option.id} />
            <button
              type="submit"
              disabled={pending}
              className={`relative min-h-12 w-full overflow-hidden rounded-2xl text-left ring-1 ${
                mine
                  ? "ring-[#c9a45c]"
                  : "ring-[rgba(27,58,47,0.14)]"
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 ${mine ? "bg-[rgba(201,164,92,0.35)]" : "bg-[rgba(27,58,47,0.08)]"}`}
                style={{ width: `${share}%` }}
              />
              <span className="relative flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-semibold text-[#14241c]">{option.label}</span>
                <span className="shrink-0 text-sm font-semibold text-[#3d5247]">
                  {mine ? "Your vote · " : ""}
                  {share}%
                </span>
              </span>
            </button>
          </form>
        );
      })}
      <p className="text-sm text-[#3d5247]">
        {poll.total} {poll.total === 1 ? "vote" : "votes"}. Tap a choice to vote. You can change it.
      </p>
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
    </div>
  );
}

function ReplyBox({ postId }: { postId: number }) {
  const [state, action, pending] = useActionState(replyToPost, initial);
  return (
    <Form handled action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="postId" value={postId} />
      <TextAreaField label="Reply" name="body" required rows={2} />
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-forest w-full sm:w-fit">
        {pending ? "Sending…" : "Reply"}
      </button>
    </Form>
  );
}

export function UpdatesBoard({
  posts,
  notices,
  userId,
  canModerate,
}: {
  posts: FeedPost[]
  notices: { id: number; title: string; body: string | null; created_at: string }[]
  userId: string
  canModerate: boolean
}) {
  const [filter, setFilter] = useState<PostKind | "all">("all");
  const visible =
    filter === "all" ? posts : posts.filter((post) => (post.kind || "update") === filter);

  return (
    <div>
      <Composer />

      {notices.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#14241c]">Notices</h2>
          <ul className="mt-3 divide-y divide-[rgba(27,58,47,0.08)]">
            {notices.map((notice) => (
              <li key={notice.id} className="py-3">
                <p className="font-semibold text-[#14241c]">{notice.title}</p>
                {notice.body ? <p className="mt-1 text-[#3d5247]">{notice.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {COMMUNITY_POST_KINDS.map((kind) => (
          <FilterChip
            key={kind.value}
            active={filter === kind.value}
            onClick={() => setFilter(kind.value)}
          >
            {kind.label}
          </FilterChip>
        ))}
      </div>

      <ul className="divide-y divide-[rgba(27,58,47,0.08)]">
        {visible.length === 0 ? (
          <li className="py-6 text-[#3d5247]">
            {filter === "all" ? "No posts yet." : `Nothing in ${postKind(filter)?.label ?? "this list"} yet.`}
          </li>
        ) : (
          visible.map((post) => (
            <li key={post.id} className="py-5">
              <p className="text-sm font-semibold text-[#7a5c22]">
                <span className="mr-2 inline-flex rounded-full bg-[#1b3a2f] px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-[#e8d5a3] uppercase">
                  {postKind(post.kind)?.label ?? "Update"}
                </span>
                {post.author_name}
                {post.flat_number ? ` · ${post.flat_number}` : ""}
              </p>
              <p className="mt-1 text-base text-[#14241c]">{post.body}</p>
              {post.kind === "poll" && post.poll ? <PollChoices postId={post.id} poll={post.poll} /> : null}
              {post.author_user_id === userId || canModerate ? (
                <form action={deletePost} className="mt-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <button type="submit" className="text-sm font-semibold text-[#8a2f2f]">
                    Delete
                  </button>
                </form>
              ) : null}
              <ul className="mt-3 space-y-2 border-l border-[rgba(27,58,47,0.12)] pl-3">
                {post.replies.map((reply) => (
                  <li key={reply.id}>
                    <p className="text-sm font-semibold text-[#3d5247]">
                      {reply.author_name}
                      {reply.flat_number ? ` · ${reply.flat_number}` : ""}
                    </p>
                    <p className="text-base text-[#14241c]">{reply.body}</p>
                    {reply.author_user_id === userId || canModerate ? (
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
              <ReplyBox postId={post.id} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
