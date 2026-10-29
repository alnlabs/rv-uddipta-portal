export function HeroBand({
  children,
  fill = false,
}: {
  children: React.ReactNode
  fill?: boolean
}) {
  return (
    <section
      className={`hero-band flex items-end justify-center text-[#f8fafc] md:items-center md:justify-start ${
        fill ? "hero-band-fill" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-uddiipta.jpg"
        alt="RV Uddiipta residences in Karmanghat"
        className="hero-band-media h-full w-full object-cover object-center"
      />
      <div className="hero-band-shade" aria-hidden />
      {children}
    </section>
  );
}
