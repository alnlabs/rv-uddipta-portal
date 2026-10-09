import { B2ArchitecturalPlan } from "@/components/B2ArchitecturalPlan";
import { B2_META } from "@/lib/plans/b2";

export default function B2PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {B2_META.unit} · {B2_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {B2_META.floors}. Used for every B2 2D view. East of B1, across the corridor.
          North at the top, west to the corridor / entrance. SBUA{" "}
          {B2_META.sbuaSft.toLocaleString()} sft, carpet {B2_META.carpetSft.toLocaleString()} sft,
          balcony {B2_META.balconySft} sft. Base plan — walls, doors, windows, brochure
          dimensions.
        </p>
      </header>
      <B2ArchitecturalPlan />
    </div>
  );
}
