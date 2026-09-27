import { B3ArchitecturalPlan } from "@/components/B3ArchitecturalPlan";
import { B3_META } from "@/lib/plans/b3";

export default function B3PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {B3_META.unit} · {B3_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {B3_META.floors}. Used for every B3 2D view. Western B-block row, south of B5,
          immediately west of the staircase lobby. North at the top, east to the lobby /
          corridor. SBUA {B3_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {B3_META.carpetSft.toLocaleString()} sft, balcony {B3_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B3ArchitecturalPlan />
    </div>
  );
}
