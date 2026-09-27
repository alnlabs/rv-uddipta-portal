import { B5ArchitecturalPlan } from "@/components/B5ArchitecturalPlan";
import { B5_META } from "@/lib/plans/b5";

export default function B5PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {B5_META.unit} · {B5_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {B5_META.floors}. Used for every B5 2D view. Western B-block row, south of B6. North
          at the top, east to the common corridor. SBUA {B5_META.sbuaSft.toLocaleString()} sft,
          carpet {B5_META.carpetSft.toLocaleString()} sft, balcony {B5_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B5ArchitecturalPlan />
    </div>
  );
}
