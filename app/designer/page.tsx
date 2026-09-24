import { listSavedDesignPrompts } from "@/app/actions/design-prompt";
import { FlatDesigner } from "@/components/FlatDesigner";

export default async function DesignerPage() {
  const savedKeys = await listSavedDesignPrompts();

  return (
    <div className="page-gutter max-w-[1400px] py-6 md:py-10">
      <header className="mb-6 border-b border-[rgba(27,58,47,0.1)] pb-5">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[#7a5c22] uppercase">
          2D designer
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#14241c]">
          Flat grid prompts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3d5247]">
          Public page. The plan is drawn in square yard cells. Type or paste a
          prompt — the numbered yard layout updates as the prompt changes.
        </p>
      </header>
      <FlatDesigner savedKeys={savedKeys} />
    </div>
  );
}
