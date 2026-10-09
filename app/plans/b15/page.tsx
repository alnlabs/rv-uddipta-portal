import { B15ArchitecturalPlan } from "@/components/B15ArchitecturalPlan";
import { B15_META } from "@/lib/plans/b15";

export default function B15PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B15_META.unit} · {B15_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B15_META.floors}. Used for every B15 2D view. East of B9. North at the top, corridor
          on the west. SBUA {B15_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {B15_META.carpetSft.toLocaleString()} sft, balcony {B15_META.balconySft} sft. Base plan —
          walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B15ArchitecturalPlan />
    </div>
  );
}
