export function HeroBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="hero-band flex items-center justify-center text-[#f7f2e6] md:justify-start">
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
