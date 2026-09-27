import { B13ArchitecturalPlan } from "@/components/B13ArchitecturalPlan";
import { B13_META } from "@/lib/plans/b13";

export default function B13PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {B13_META.unit} · {B13_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {B13_META.floors}. Used for every B13 2D view. East of B12. North at the top, corridor
          on the west. SBUA {B13_META.sbuaSft.toLocaleString()} sft. Base plan — walls, doors,
          windows, brochure dimensions.
        </p>
      </header>
      <B13ArchitecturalPlan />
    </div>
  );
}
