"use client";

import { useActionState, useRef, useState } from "react";
import { createEnquiry, type EnquiryState } from "@/app/actions/enquiries";
import { EnquirySettingsFields } from "@/components/EnquirySettingsFields";
import {
  Form,
  FormAlert,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/form-ui";
import { FIELD_KINDS } from "@/lib/enquiries";

const initial: EnquiryState = { ok: false, message: "" };

type Draft = { id: number; kind: string };

export function CreateEnquiryForm() {
  const [state, action, pending] = useActionState(createEnquiry, initial);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const nextId = useRef(2);
  const [questions, setQuestions] = useState<Draft[]>([{ id: 1, kind: "text" }]);

  function addQuestion() {
    const id = nextId.current;
    nextId.current += 1;
    setQuestions((current) => [...current, { id, kind: "text" }]);
  }

  function removeQuestion(id: number) {
    setQuestions((current) =>
      current.length === 1 ? current : current.filter((question) => question.id !== id),
    );
  }

  function setKind(id: number, kind: string) {
    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, kind } : question)),
    );
  }

  return (
    <Form handled action={action} className="form-sheet grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">New form</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#14241c]">
            Create a form
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#3d5247]">
            Write the questions people will answer. The title is the heading above them.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            type="button"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
            className="btn btn-ghost ring-1 ring-[rgba(27,58,47,0.14)]"
          >
            {settingsOpen ? "Hide settings" : "Settings"}
          </button>
          {settingsOpen ? null : (
            <p className="text-sm leading-relaxed text-[#3d5247]">
              Anyone with the link can open it. The community can see the answers.
            </p>
          )}
        </div>
      </div>
      <EnquirySettingsFields part="content" />
      <div className="grid gap-4 border-t border-[rgba(27,58,47,0.08)] pt-5">
        <div>
          <p className="eyebrow">Questions</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-[#14241c]">
            What people answer
          </h3>
        </div>
        {questions.map((question, index) => (
          <QuestionDraft
            key={question.id}
            question={question}
            index={index}
            canRemove={questions.length > 1}
            onKind={(kind) => setKind(question.id, kind)}
            onRemove={() => removeQuestion(question.id)}
          />
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="btn btn-ghost w-full ring-1 ring-[rgba(27,58,47,0.14)] sm:w-fit"
        >
          Add another question
        </button>
      </div>
      <div className={settingsOpen ? "grid gap-5" : "hidden"}>
        <EnquirySettingsFields part="access" />
      </div>
      {state.message ? <FormAlert tone={state.ok ? "ok" : "error"}>{state.message}</FormAlert> : null}
      <button type="submit" disabled={pending} className="btn btn-gold w-full sm:w-fit">
        {pending ? "Creating…" : "Create form"}
      </button>
    </Form>
  );
}

function QuestionDraft({
  question,
  index,
  canRemove,
  onKind,
  onRemove,
}: {
  readonly question: Draft
  readonly index: number
  readonly canRemove: boolean
  readonly onKind: (kind: string) => void
  readonly onRemove: () => void
}) {
  const prefix = `q-${question.id}`;
  const kindHint = FIELD_KINDS.find((item) => item.value === question.kind)?.hint;

  return (
    <div className="grid gap-4 rounded-[1.25rem] border border-[rgba(27,58,47,0.1)] bg-white p-4 md:grid-cols-2">
      <div className="flex items-center justify-between gap-3 md:col-span-2">
        <p className="text-sm font-semibold text-[#7a5c22]">Question {index + 1}</p>
        {canRemove ? (
          <button type="button" onClick={onRemove} className="btn btn-danger">
            Remove
          </button>
        ) : null}
      </div>
      <TextField
        label="Question"
        name={`${prefix}-label`}
        required
        minLength={2}
        tone="question"
        placeholder="Which date works for you?"
      />
      <SelectField
        label="How they answer"
        name={`${prefix}-kind`}
        required
        tone="question"
        value={question.kind}
        onChange={onKind}
        options={FIELD_KINDS.map(({ value, label }) => ({ value, label }))}
        hint={kindHint}
      />
      {question.kind === "choice" ? (
        <TextAreaField
          label="Options"
          name={`${prefix}-choices`}
          required
          rows={4}
          tone="question"
          placeholder={"Morning\nEvening\nEither is fine"}
          hint="One option on each line. People can pick one. At least two."
          className="md:col-span-2"
        />
      ) : null}
      <div className="md:col-span-2">
        <SwitchField
          label="They must answer this"
          hint="The form will not send until this question is filled in."
          name={`${prefix}-required`}
        />
      </div>
    </div>
  );
}
