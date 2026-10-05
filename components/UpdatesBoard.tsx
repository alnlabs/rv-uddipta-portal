"use client";

import { useActionState, useState } from "react";
import {
  deletePost,
  deleteReply,
  postUpdate,
  replyToPost,
  sendNote,
  type UpdateState,
} from "@/app/actions/updates";
import { Form, FormAlert, TextAreaField } from "@/components/form-ui";

const initial: UpdateState = { ok: false, message: "" };

type Reply = {
  id: number
  author_name: string
  flat_number: string | null
  body: string
  author_user_id: string
};

export type FeedPost = {
  id: number
  author_name: string
  flat_number: string | null
  body: string
  author_user_id: string
  created_at: string
  replies: Reply[]
};

function Composer({
  mode,
  onDone,
}: {
  mode: "post" | "request" | "feedback"
  onDone: () => void
}) {
  const action = mode === "post" ? postUpdate : sendNote;
  const [state, formAction, pending] = useActionState(action, initial);
  const label =
    mode === "post" ? "Post" : mode === "request" ? "Send a request" : "Send feedback";

  return (
    <Form handled action={formAction} className="field-panel mt-4 grid gap-3">
      {mode !== "post" ? <input type="hidden" name="kind" value={mode} /> : null}
      <TextAreaField
        label={
          mode === "post"
            ? "What do you want to tell the building?"
            : mode === "request"
              ? "What do you need?"
              : "What do you want the admin to know?"
        }
        name="body"
        required
        minLength={2}
        rows={4}
      />
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button type="submit" disabled={pending} className="btn btn-gold">
          {pending ? "Sending…" : label}
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </Form>
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
  const [mode, setMode] = useState<"post" | "request" | "feedback" | null>(null);

  return (
    <div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "post" ? null : "post")}
          className={`min-h-12 rounded-2xl px-2 text-sm font-semibold ${
            mode === "post" ? "bg-[#14241c] text-[#e8d5a3]" : "bg-[#1b3a2f] text-[#e8d5a3]"
          }`}
        >
          Post
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "request" ? null : "request")}
          className={`min-h-12 rounded-2xl px-2 text-sm font-semibold ${
            mode === "request" ? "bg-[#14241c] text-[#e8d5a3]" : "bg-[#c9a45c] text-[#14241c]"
          }`}
        >
          Request
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "feedback" ? null : "feedback")}
          className={`min-h-12 rounded-2xl px-2 text-sm font-semibold ring-1 ring-[rgba(27,58,47,0.2)] ${
            mode === "feedback" ? "bg-[#1b3a2f] text-[#e8d5a3]" : "text-[#14241c]"
          }`}
        >
          Feedback
        </button>
      </div>
      {mode ? <Composer mode={mode} onDone={() => setMode(null)} /> : null}

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

      <ul className="mt-8 divide-y divide-[rgba(27,58,47,0.08)]">
        {posts.length === 0 ? (
          <li className="py-6 text-[#3d5247]">No posts yet.</li>
        ) : (
          posts.map((post) => (
            <li key={post.id} className="py-5">
              <p className="text-sm font-semibold text-[#7a5c22]">
                {post.author_name}
                {post.flat_number ? ` · ${post.flat_number}` : ""}
              </p>
              <p className="mt-1 text-base text-[#14241c]">{post.body}</p>
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
