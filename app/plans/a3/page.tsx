import { A3ArchitecturalPlan } from "@/components/A3ArchitecturalPlan";
import { A3_META } from "@/lib/plans/a3";

export default function A3PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A3_META.unit} · {A3_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A3_META.floors}. Used for every A3 2D view. North of A2, west to the common
          corridor. North at the top, east to the 5' balcony. SBUA{" "}
          {A3_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {A3_META.carpetSft.toLocaleString()} sft, balcony {A3_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A3ArchitecturalPlan />
    </div>
  );
}
