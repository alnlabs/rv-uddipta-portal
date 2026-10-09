"use client";

import { initialsFromName } from "@/lib/profilePhoto";

export default function ProfileAvatar({
  name,
  photoUrl,
  size = "md",
  tone = "owner",
}: {
  name: string
  photoUrl?: string | null
  size?: "sm" | "md" | "lg"
  tone?: "owner" | "member"
}) {
  const dim =
    size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-10 text-xs" : "size-12 text-sm";
  const bg = tone === "member" ? "bg-[#1e293b]" : "bg-[#0f172a]";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-[rgba(15,23,42,0.12)]`}
      />
    );
  }

  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-full ${bg} font-bold tracking-wide text-[#f8fafc]`}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  );
}
