import { A4ArchitecturalPlan } from "@/components/A4ArchitecturalPlan";
import { A4_META } from "@/lib/plans/a4";

export default function A4PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A4_META.unit} · {A4_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A4_META.floors}. Used for every A4 2D view. Western A-block row, immediately west
          of A3. North at the top, east to the lobby / lift. SBUA{" "}
          {A4_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {A4_META.carpetSft.toLocaleString()} sft, balcony {A4_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A4ArchitecturalPlan />
    </div>
  );
}
