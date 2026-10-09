"use client";

import DOMPurify from "dompurify";
import { useEffect, useRef } from "react";
import { FieldMessage } from "@/components/form-ui";
import { looksRich, visibleText } from "@/lib/richText";
import "quill/dist/quill.snow.css";

const TOOLBAR = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }, { font: [] }, { size: [] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  [{ direction: "rtl" }, { align: [] }],
  ["blockquote", "code-block"],
  ["link", "image", "video"],
  ["clean"],
];

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "img",
  "iframe",
  "span",
];

let styleHooked = false;

function allowSafeStyle() {
  if (styleHooked || typeof window === "undefined") return;
  styleHooked = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "class") {
      const classes = data.attrValue.split(/\s+/).filter((name) => /^ql-[a-z0-9-]+$/i.test(name));
      if (!classes.length) data.keepAttr = false;
      else data.attrValue = classes.join(" ");
      return;
    }
    if (data.attrName === "src" && node.nodeName === "IFRAME") {
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//i.test(data.attrValue)) {
        data.keepAttr = false;
      }
      return;
    }
    if (data.attrName !== "style") return;
    const kept = data.attrValue
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .flatMap((part) => {
        const splitAt = part.indexOf(":");
        if (splitAt < 0) return [];
        const key = part.slice(0, splitAt).trim().toLowerCase();
        const value = part.slice(splitAt + 1).trim();
        if (!value || /url\(|expression|javascript/i.test(value)) return [];
        if (key === "text-align" && /^(left|center|right|justify)$/i.test(value)) {
          return [`text-align: ${value.toLowerCase()}`];
        }
        if (
          (key === "color" || key === "background-color") &&
          /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+)\s*\))$/i.test(
            value,
          )
        ) {
          return [`${key}: ${value}`];
        }
        return [];
      });
    if (!kept.length) data.keepAttr = false;
    else data.attrValue = kept.join("; ");
  });
}

export function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return "";
  allowSafeStyle();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "style", "class", "frameborder", "allowfullscreen", "data-list"],
    ALLOW_DATA_ATTR: false,
  });
}

type QuillEditor = {
  on: (event: "text-change", handler: () => void) => void
  getSemanticHTML: () => string
};

function RichTextBody({ text, className = "" }: { readonly text: string; readonly className?: string }) {
  if (!looksRich(text)) return <p className={className}>{text}</p>;
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />;
}

export function RichTextView({ text, className = "" }: { readonly text: string; readonly className?: string }) {
  return <RichTextBody text={text} className={className} />;
}

export function RichTextField({
  label,
  name,
  required = false,
  maxLength,
  placeholder,
  emptyMessage = "Write a few words before posting.",
}: {
  readonly label: string
  readonly name: string
  readonly required?: boolean
  readonly maxLength?: number
  readonly placeholder?: string
  readonly emptyMessage?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLTextAreaElement>(null);
  const hintRef = useRef(placeholder || label);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let quill: QuillEditor | null = null;

    void import("quill").then((mod) => {
      if (dead || !hostRef.current) return;
      const Quill = mod.default;
      quill = new Quill(hostRef.current, {
        theme: "snow",
        placeholder: hintRef.current,
        modules: { toolbar: TOOLBAR },
      }) as QuillEditor;
      const publish = () => {
        const hidden = hiddenRef.current;
        if (!hidden || !quill) return;
        const html = quill.getSemanticHTML();
        hidden.value = visibleText(html) ? sanitizeHtml(html) : "";
      };
      quill.on("text-change", publish);
    });

    return () => {
      dead = true;
      const parent = host.parentElement;
      parent?.querySelector(":scope > .ql-toolbar")?.remove();
      host.className = "";
      host.innerHTML = "";
    };
  }, []);

  return (
    <div className="grid gap-1.5">
      <span className="field-label">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="quill-field">
        <div ref={hostRef} data-field={name} aria-label={label} tabIndex={-1} />
      </div>
      <textarea
        ref={hiddenRef}
        name={name}
        data-label="description"
        data-empty={emptyMessage}
        required={required}
        className="hidden"
      />
      <FieldMessage name={name} />
      {maxLength ? <span className="field-hint">Up to {maxLength} characters.</span> : null}
    </div>
  );
}
