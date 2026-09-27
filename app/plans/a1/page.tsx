import { A1ArchitecturalPlan } from "@/components/A1ArchitecturalPlan";
import FlatUnit3D from "@/components/FlatUnit3D";
import { A1_META } from "@/lib/plans/a1";

const A1_FLAT = {
  flatNumber: "A101",
  wing: "A",
  floor: 1,
  unit: 1,
  type: "3BHK",
  facing: "W",
  areaSqft: A1_META.sbuaSft,
};

export default function A1PlanPage() {
  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          Brochure unit plan
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          {A1_META.unit} · {A1_META.type}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          {A1_META.floors}. Used for every A1 2D and 3D view. South-west A-block corner.
          North at the top, east to the common corridor. SBUA{" "}
          {A1_META.sbuaSft.toLocaleString()} sft, carpet{" "}
          {A1_META.carpetSft.toLocaleString()} sft, balcony {A1_META.balconySft} sft.
          Base plan — walls, doors, windows, brochure dimensions.
        </p>
      </header>
      <A1ArchitecturalPlan />
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#14241c]">3D interior</h2>
        <FlatUnit3D flat={A1_FLAT} />
      </section>
    </div>
  );
}
