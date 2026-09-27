import { A2ArchitecturalPlan } from "@/components/A2ArchitecturalPlan";
import { A2_META } from "@/lib/plans/a2";

export default function A2PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A2_META.unit} · {A2_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A2_META.floors}. Used for every A2 2D view. Immediately east of A1.
          North at the top, west to the common corridor. SBUA{" "}
          {A2_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {A2_META.carpetSft.toLocaleString()} sft, balcony {A2_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A2ArchitecturalPlan />
    </div>
  );
}
