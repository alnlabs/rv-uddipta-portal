import { A6ArchitecturalPlan } from "@/components/A6ArchitecturalPlan";
import { A6_META } from "@/lib/plans/a6";

export default function A6PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {A6_META.unit} · {A6_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {A6_META.floors}. Used for every A6 2D view. Western A-block row, immediately west
          of A5. North at the top, east to the corridor. SBUA{" "}
          {A6_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {A6_META.carpetSft.toLocaleString()} sft, balcony {A6_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A6ArchitecturalPlan />
    </div>
  );
}
