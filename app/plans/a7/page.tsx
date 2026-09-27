import { A7ArchitecturalPlan } from "@/components/A7ArchitecturalPlan";
import { A7_META } from "@/lib/plans/a7";

export default function A7PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A7_META.unit} · {A7_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A7_META.floors}. Used for every A7 2D view. East of the A8 corridor. North at the
          top, west to the common corridor. SBUA {A7_META.sbuaSft.toLocaleString()} sft,
          carpet {A7_META.carpetSft.toLocaleString()} sft, balcony {A7_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A7ArchitecturalPlan />
    </div>
  );
}
