"use server";

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DIR = path.join(process.cwd(), "data", "design-prompts");
const KEY = /^[AB]\d{1,2}(?:-floor1)?$/;
const MAX = 400_000;

function fileFor(key: string) {
  if (!KEY.test(key)) throw new Error("Unknown design unit");
  return path.join(DIR, `${key}.md`);
}

export async function listSavedDesignPrompts() {
  try {
    const names = await readdir(DIR);
    return names
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.replace(/\.md$/, ""))
      .sort();
  } catch {
    return [];
  }
}

export async function loadDesignPrompt(key: string) {
  try {
    return await readFile(fileFor(key), "utf8");
  } catch {
    return null;
  }
}

export async function saveDesignPrompt(key: string, markdown: string) {
  if (!markdown.trim()) throw new Error("Prompt is empty");
  if (markdown.length > MAX) throw new Error("Prompt is too long");
  await mkdir(DIR, { recursive: true });
  const file = fileFor(key);
  await writeFile(file, markdown, "utf8");
  return { ok: true as const, file: path.relative(process.cwd(), file) };
}
