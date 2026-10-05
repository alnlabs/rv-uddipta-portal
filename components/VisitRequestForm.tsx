"use client";

import { useActionState } from "react";
import { bookVisit, type VisitState } from "@/app/actions/visit";
import { Form, FormAlert, TextAreaField, TextField } from "@/components/form-ui";

const initial: VisitState = { ok: false, message: "" };

export function VisitRequestForm() {
  const [state, action, pending] = useActionState(bookVisit, initial);

  return (
    <Form handled action={action} className="mt-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Your name"
          name="name"
          required
          minLength={2}
          autoComplete="name"
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          required
          autoComplete="tel"
          placeholder="10-digit mobile"
        />
      </div>
      <TextAreaField
        label="When you want to visit"
        name="note"
        rows={3}
        placeholder="A day and a time, if you have one"
      />
      {state.message ? (
        <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Sending…" : "Book a visit"}
      </button>
    </Form>
  );
}
