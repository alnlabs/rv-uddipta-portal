export function FeatureOff({ label }: { readonly label: string }) {
  return (
    <section className="page-gutter max-w-3xl py-10">
      <h1 className="text-3xl font-semibold text-[#0f172a]">{label}</h1>
      <p className="mt-3 text-[#475569]">The office has turned this off for RV Uddiipta.</p>
    </section>
  );
}

export function DeskError({ message }: { readonly message: string }) {
  return (
    <section className="page-gutter max-w-3xl py-10">
      <h1 className="text-3xl font-semibold text-[#0f172a]">Not ready</h1>
      <p className="mt-3 text-[#475569]">
        This desk needs the latest community update applied to the database. {message}
      </p>
    </section>
  );
}
