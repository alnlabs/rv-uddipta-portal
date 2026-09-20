export default function StatusLegend() {
  return (
    <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#3d5247]">
      <li>
        <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-[#2f5a48]" /> Registration
      </li>
      <li>
        <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-[#9a5b3c]" /> Interior
      </li>
      <li>
        <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-[#c9a45c]" /> Ceremony
      </li>
      <li>
        <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-[#4f8a6c]" /> Moving
      </li>
    </ul>
  );
}
