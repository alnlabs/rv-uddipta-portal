import { B14ArchitecturalPlan } from "@/components/B14ArchitecturalPlan";
import { B14_META } from "@/lib/plans/b14";

export default function B14PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B14_META.unit} · {B14_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B14_META.floors}. Used for every B14 2D view. South of B15. North at the top, corridor
          on the west. SBUA {B14_META.sbuaSft.toLocaleString()} sft. Base plan — walls, doors,
          windows, brochure dimensions.
        </p>
      </header>
      <B14ArchitecturalPlan />
    </div>
  );
}
