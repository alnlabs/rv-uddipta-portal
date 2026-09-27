import { B8ArchitecturalPlan } from "@/components/B8ArchitecturalPlan";
import { B8_META } from "@/lib/plans/b8";

export default function B8PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {B8_META.unit} · {B8_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {B8_META.floors}. Used for every B8 2D view. East of B7. North at the top, corridor
          on the south. SBUA {B8_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {B8_META.carpetSft.toLocaleString()} sft, balcony {B8_META.balconySft} sft. Base plan —
          walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <B8ArchitecturalPlan />
    </div>
  );
}
