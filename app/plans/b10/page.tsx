import { B10ArchitecturalPlan } from "@/components/B10ArchitecturalPlan";
import { B10_META } from "@/lib/plans/b10";

export default function B10PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B10_META.unit} · {B10_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B10_META.floors}. Used for every B10 2D view. West of B11. North at the top, corridor
          on the east. SBUA {B10_META.sbuaSft.toLocaleString()} sft. Base plan — walls, doors,
          windows, brochure dimensions.
        </p>
      </header>
      <B10ArchitecturalPlan />
    </div>
  );
}
