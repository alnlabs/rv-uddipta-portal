import Image from "next/image";

export function Mark({
  size = 36,
  alt = "",
}: {
  size?: number
  alt?: string
}) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-xl"
    />
  );
}
