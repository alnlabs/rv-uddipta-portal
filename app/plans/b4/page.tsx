import { B4ArchitecturalPlan } from "@/components/B4ArchitecturalPlan";
import { B4_META } from "@/lib/plans/b4";

export default function B4PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B4_META.unit} · {B4_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B4_META.floors}. Used for every B4 2D view. East of B3, across the corridor.
          North at the top, west to the corridor / entrance. SBUA{" "}
          {B4_META.sbuaSft.toLocaleString()} sft, carpet {B4_META.carpetSft.toLocaleString()} sft,
          balcony {B4_META.balconySft} sft. Base plan — walls, doors, windows, brochure
          dimensions.
        </p>
      </header>
      <B4ArchitecturalPlan />
    </div>
  );
}
