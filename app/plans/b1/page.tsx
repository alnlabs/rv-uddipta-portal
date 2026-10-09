import { B1ArchitecturalPlan } from "@/components/B1ArchitecturalPlan";
import { B1_META } from "@/lib/plans/b1";

export default function B1PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B1_META.unit} · {B1_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B1_META.floors}. Used for every B1 2D view. Western B-block row, south of B3.
          North at the top, east to the corridor. SBUA {B1_META.sbuaSft.toLocaleString()} sft,
          carpet {B1_META.carpetSft.toLocaleString()} sft, balcony {B1_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B1ArchitecturalPlan />
    </div>
  );
}
