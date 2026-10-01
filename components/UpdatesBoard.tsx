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
    <form action={formAction} className="mt-4 grid gap-3">
      {mode !== "post" ? <input type="hidden" name="kind" value={mode} /> : null}
      <label className="block text-sm font-semibold text-[#14241c]">
        {mode === "post"
          ? "What do you want to tell the building?"
          : mode === "request"
            ? "What do you need?"
            : "What do you want the admin to know?"}
        <textarea
          name="body"
          required
          minLength={2}
          rows={4}
          className="mt-1 w-full rounded-2xl border border-[rgba(27,58,47,0.14)] bg-white px-4 py-3 text-base font-normal"
        />
      </label>
      {state.message ? (
        <p className={state.ok ? "text-sm font-semibold text-[#2f5a48]" : "text-sm text-[#8a2f2f]"}>
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-[#c9a45c] px-5 text-base font-semibold text-[#14241c] disabled:opacity-60"
        >
          {pending ? "Sending…" : label}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-12 rounded-full px-4 text-base font-semibold text-[#3d5247]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ReplyBox({ postId }: { postId: number }) {
  const [state, action, pending] = useActionState(replyToPost, initial);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="postId" value={postId} />
      <label className="block text-sm font-semibold text-[#14241c]">
        Reply
        <textarea
          name="body"
          required
          rows={2}
          className="mt-1 w-full rounded-2xl border border-[rgba(27,58,47,0.14)] bg-white px-3 py-2 text-base font-normal"
        />
      </label>
      {state.message ? (
        <p className={state.ok ? "text-sm text-[#2f5a48]" : "text-sm text-[#8a2f2f]"}>
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-fit rounded-full bg-[#1b3a2f] px-4 text-sm font-semibold text-[#e8d5a3] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Reply"}
      </button>
    </form>
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
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setMode("post")}
          className="min-h-16 rounded-2xl bg-[#1b3a2f] px-4 text-base font-semibold text-[#e8d5a3]"
        >
          Post
        </button>
        <button
          type="button"
          onClick={() => setMode("request")}
          className="min-h-16 rounded-2xl bg-[#c9a45c] px-4 text-base font-semibold text-[#14241c]"
        >
          Send a request
        </button>
        <button
          type="button"
          onClick={() => setMode("feedback")}
          className="min-h-16 rounded-2xl px-4 text-base font-semibold text-[#14241c] ring-1 ring-[rgba(27,58,47,0.2)]"
        >
          Send feedback
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
