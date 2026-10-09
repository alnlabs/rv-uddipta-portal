import { B12ArchitecturalPlan } from "@/components/B12ArchitecturalPlan";
import { B12_META } from "@/lib/plans/b12";

export default function B12PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B12_META.unit} · {B12_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B12_META.floors}. Used for every B12 2D view. West of B13. North at the top, corridor
          and lift on the east. SBUA {B12_META.sbuaSft.toLocaleString()} sft. Base plan — walls,
          doors, windows, brochure dimensions.
        </p>
      </header>
      <B12ArchitecturalPlan />
    </div>
  );
}
