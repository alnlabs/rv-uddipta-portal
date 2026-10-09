import { A10ArchitecturalPlan } from "@/components/A10ArchitecturalPlan";
import { A10_META } from "@/lib/plans/a10";

export default function A10PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(15,23,42,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#b45309] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0f172a]">
          {A10_META.unit} · {A10_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#475569]">
          {A10_META.floors}. Used for every A10 2D view. East of A9, end of the A-block pair.
          North at the top, south to the common corridor. SBUA {A10_META.sbuaSft.toLocaleString()}{" "}
          sft, carpet {A10_META.carpetSft.toLocaleString()} sft, balcony {A10_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A10ArchitecturalPlan />
    </div>
  );
}
