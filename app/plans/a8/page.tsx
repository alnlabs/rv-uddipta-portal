import { A8ArchitecturalPlan } from "@/components/A8ArchitecturalPlan";
import { A8_META } from "@/lib/plans/a8";

export default function A8PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A8_META.unit} · {A8_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A8_META.floors}. Used for every A8 2D view. Western A-block row. North at the
          top, east to the staircase lobby. SBUA {A8_META.sbuaSft.toLocaleString()} sft,
          carpet {A8_META.carpetSft.toLocaleString()} sft, balcony {A8_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A8ArchitecturalPlan />
    </div>
  );
}
