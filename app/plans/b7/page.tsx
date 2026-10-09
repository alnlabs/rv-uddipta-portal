import { B7ArchitecturalPlan } from "@/components/B7ArchitecturalPlan";
import { B7_META } from "@/lib/plans/b7";

export default function B7PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B7_META.unit} · {B7_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B7_META.floors}. Used for every B7 2D view. East of B6. North at the top, corridors
          on the west and south. SBUA {B7_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {B7_META.carpetSft.toLocaleString()} sft, balcony {B7_META.balconySft} sft. Base plan —
          walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B7ArchitecturalPlan />
    </div>
  );
}
