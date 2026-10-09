import { B9ArchitecturalPlan } from "@/components/B9ArchitecturalPlan";
import { B9_META } from "@/lib/plans/b9";

export default function B9PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B9_META.unit} · {B9_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B9_META.floors}. Used for every B9 2D view. East of B8. North at the top, corridor
          on the south. SBUA {B9_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {B9_META.carpetSft.toLocaleString()} sft, balcony {B9_META.balconySft} sft. Base plan —
          walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B9ArchitecturalPlan />
    </div>
  );
}
