"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  loadDesignPrompt,
  saveDesignPrompt,
} from "@/app/actions/design-prompt";
import {
  buildDesignGrid,
  buildDesignPrompt,
  cellFill,
  findDesignUnit,
  listDesignUnits,
  parsePromptState,
  roomKey,
  yardGridForUnit,
  type DesignGrid,
  type DesignUnit,
  type GridCell,
} from "@/lib/designGrid";

type Wall = {
  x1: number
  y1: number
  x2: number
  y2: number
  outer: boolean
};

function wallsFor(grid: DesignGrid): Wall[] {
  const at = (row: number, col: number) =>
    grid.cells.find((cell) => cell.row === row && cell.col === col);
  const walls: Wall[] = [];

  for (const cell of grid.cells) {
    const here = roomKey(cell.contains);
    const east = at(cell.row, cell.col + 1);
    const south = at(cell.row + 1, cell.col);
    if (!east || roomKey(east.contains) !== here) {
      walls.push({
        x1: cell.x + cell.w,
        y1: cell.y,
        x2: cell.x + cell.w,
        y2: cell.y + cell.h,
        outer: !east,
      });
    }
    if (!south || roomKey(south.contains) !== here) {
      walls.push({
        x1: cell.x,
        y1: cell.y + cell.h,
        x2: cell.x + cell.w,
        y2: cell.y + cell.h,
        outer: !south,
      });
    }
    if (cell.col === 1) {
      walls.push({
        x1: cell.x,
        y1: cell.y,
        x2: cell.x,
        y2: cell.y + cell.h,
        outer: true,
      });
    }
    if (cell.row === 1) {
      walls.push({
        x1: cell.x,
        y1: cell.y,
        x2: cell.x + cell.w,
        y2: cell.y,
        outer: true,
      });
    }
  }

  return walls;
}

function roomLabels(grid: DesignGrid) {
  const seen = new Set<number>();
  const labels: { key: string; x: number; y: number; size: number }[] = [];

  for (const start of grid.cells) {
    if (seen.has(start.n)) continue;
    const key = roomKey(start.contains);
    const group: GridCell[] = [];
    const stack = [start];
    seen.add(start.n);
    while (stack.length) {
      const cur = stack.pop()!;
      group.push(cur);
      for (const next of grid.cells) {
        if (seen.has(next.n) || roomKey(next.contains) !== key) continue;
        const beside =
          (next.row === cur.row && Math.abs(next.col - cur.col) === 1) ||
          (next.col === cur.col && Math.abs(next.row - cur.row) === 1);
        if (!beside) continue;
        seen.add(next.n);
        stack.push(next);
      }
    }
    if (
      key.toLowerCase().includes("empty") ||
      key.toLowerCase().includes("wall")
    ) {
      continue;
    }
    const x = group.reduce((sum, cell) => sum + cell.x + cell.w / 2, 0) / group.length;
    const y = group.reduce((sum, cell) => sum + cell.y + cell.h / 2, 0) / group.length;
    labels.push({
      key,
      x,
      y,
      size: Math.min(3.4, 1.6 + group.length * 0.12),
    });
  }

  return labels;
}

function LayoutGrid({
  unit,
  grid,
  selected,
  onSelect,
}: {
  readonly unit: DesignUnit
  readonly grid: DesignGrid
  readonly selected: number
  readonly onSelect: (n: number) => void
}) {
  const pad = 8;
  const width = grid.cols * grid.cellW;
  const height = grid.rows * grid.cellH;
  const entrySide = unit.facing === "W" ? "east" : "west";
  const faceSide = unit.facing === "W" ? "west" : "east";
  const walls = wallsFor(grid);
  const labels = roomLabels(grid);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${unit.key} yard-cell plan`}
    >
      <rect
        x={-pad}
        y={-pad}
        width={width + pad * 2}
        height={height + pad * 2}
        fill="#cfc7b8"
      />
      {grid.cells.map((item) => (
        <LayoutCell
          key={item.n}
          cell={item}
          active={item.n === selected}
          onSelect={onSelect}
        />
      ))}
      {walls.map((wall, index) => (
        <line
          key={`${wall.x1}-${wall.y1}-${index}`}
          x1={wall.x1}
          y1={wall.y1}
          x2={wall.x2}
          y2={wall.y2}
          stroke="#14241c"
          strokeWidth={wall.outer ? 0.85 : 0.45}
        />
      ))}
      {labels.map((label) => (
        <text
          key={`${label.key}-${label.x}-${label.y}`}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(20,36,28,0.55)"
          fontSize={label.size}
          fontWeight="700"
          className="pointer-events-none"
        >
          {label.key}
        </text>
      ))}
      <text
        x={entrySide === "west" ? -1.4 : width + 1.4}
        y={height / 2}
        textAnchor={entrySide === "west" ? "end" : "start"}
        dominantBaseline="middle"
        fill="#14241c"
        fontSize="2.6"
        fontWeight="700"
      >
        Entry
      </text>
      <text
        x={faceSide === "west" ? -1.4 : width + 1.4}
        y={4}
        textAnchor={faceSide === "west" ? "end" : "start"}
        fill="#14241c"
        fontSize="2.6"
        fontWeight="700"
      >
        {unit.facing === "W" ? "← West" : "East →"}
      </text>
      <text
        x={width / 2}
        y={-2.2}
        textAnchor="middle"
        fill="#3d5247"
        fontSize="2.4"
        fontWeight="700"
      >
        N · {grid.widthYd.toFixed(0)} × {grid.depthYd.toFixed(0)} yd
      </text>
    </svg>
  );
}

function LayoutCell({
  cell,
  active,
  onSelect,
}: {
  readonly cell: GridCell
  readonly active: boolean
  readonly onSelect: (n: number) => void
}) {
  return (
    <g
      onClick={() => onSelect(cell.n)}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(cell.n);
      }}
    >
      <rect
        x={cell.x}
        y={cell.y}
        width={cell.w}
        height={cell.h}
        fill={active ? "rgba(27,58,47,0.45)" : cellFill(cell.contains)}
        stroke={active ? "#c9a45c" : "rgba(27,58,47,0.28)"}
        strokeWidth={active ? 0.55 : 0.22}
      />
      <text
        x={cell.x + 0.55}
        y={cell.y + 2.1}
        fill={active ? "#e8d5a3" : "#1b3a2f"}
        fontSize="1.8"
        fontWeight="700"
      >
        {cell.n}
      </text>
    </g>
  );
}

const PITCHES = [
  { yd: 1, label: "1 yd" },
  { yd: 2, label: "2 yd" },
] as const;

export function FlatDesigner({
  savedKeys,
}: {
  readonly savedKeys: string[]
}) {
  const units = useMemo(() => listDesignUnits(), []);
  const first = units[0]!;
  const initial = yardGridForUnit(first, 1);
  const [key, setKey] = useState(first.key);
  const [pitchYd, setPitchYd] = useState(1);
  const [cols, setCols] = useState(initial.cols);
  const [rows, setRows] = useState(initial.rows);
  const [notes, setNotes] = useState("");
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState(1);
  const [promptInput, setPromptInput] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [known, setKnown] = useState(savedKeys);
  const [pending, start] = useTransition();
  const source = useRef<"ui" | "prompt">("ui");
  const skipLoad = useRef(false);
  const promptTimer = useRef<number | null>(null);

  const unit = findDesignUnit(key) ?? units[0]!;
  const grid = useMemo(
    () => buildDesignGrid(unit, cols, rows, overrides),
    [unit, cols, rows, overrides],
  );
  const cell = grid.cells.find((item) => item.n === selected) ?? grid.cells[0]!;
  const prompt = useMemo(
    () => buildDesignPrompt({ unit, grid, notes }),
    [unit, grid, notes],
  );

  function applyPrompt(text: string) {
    const state = parsePromptState(text);
    if (!state) return;
    source.current = "prompt";
    if (state.key && state.key !== unit.key && findDesignUnit(state.key)) {
      skipLoad.current = true;
      setKey(state.key);
    }
    if (state.hasGrid) {
      setCols(state.cols);
      setRows(state.rows);
      setOverrides(state.cells);
    } else if (Object.keys(state.cells).length) {
      setOverrides((prev) => ({ ...prev, ...state.cells }));
    }
    if (state.hasNotes) setNotes(state.notes);
  }

  useEffect(() => {
    if (skipLoad.current) {
      skipLoad.current = false;
      return;
    }
    let active = true;
    setOverrides({});
    setNotes("");
    setSelected(1);
    setMessage("");
    setError("");
    const size = yardGridForUnit(unit, pitchYd);
    setCols(size.cols);
    setRows(size.rows);
    void loadDesignPrompt(unit.key).then((text) => {
      if (!active || !text) return;
      source.current = "prompt";
      setPromptInput(text);
      applyPrompt(text);
    });
    return () => {
      active = false;
    };
  }, [unit.key]);

  useEffect(() => {
    if (source.current === "prompt") return;
    setPromptInput(prompt);
  }, [prompt]);

  useEffect(() => {
    return () => {
      if (promptTimer.current) window.clearTimeout(promptTimer.current);
    };
  }, []);

  function onPromptChange(text: string) {
    source.current = "prompt";
    setPromptInput(text);
    if (promptTimer.current) window.clearTimeout(promptTimer.current);
    promptTimer.current = window.setTimeout(() => applyPrompt(text), 280);
  }

  function pickUnit(next: DesignUnit) {
    source.current = "ui";
    setKey(next.key);
  }

  function save() {
    start(async () => {
      setError("");
      try {
        const result = await saveDesignPrompt(unit.key, prompt);
        setKnown((prev) =>
          prev.includes(unit.key) ? prev : [...prev, unit.key].sort(),
        );
        setMessage(`Saved ${result.file}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setMessage("Prompt copied");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)_18rem]">
      <aside className="rounded-2xl bg-[#fffcf5] p-3 ring-1 ring-[rgba(27,58,47,0.12)]">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
          Unit type
        </p>
        <p className="mt-1 text-xs text-[#3d5247]">
          Smallest set: A1–A10 and B1–B15. Floor 1 is a separate plate.
        </p>
        <ul className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">
          {units.map((item) => {
            const saved = known.includes(item.key);
            const active = item.key === unit.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => pickUnit(item)}
                  className={`flex min-h-10 w-full items-center justify-between rounded-xl px-2.5 text-left text-sm font-semibold ${
                    active
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : "text-[#14241c] hover:bg-[rgba(27,58,47,0.06)]"
                  }`}
                >
                  <span>
                    {item.wing}
                    {item.unit}
                    {item.variant === "floor1" ? " F1" : ""}
                    <span className="ml-1 text-xs font-medium opacity-80">
                      {item.type} {item.facing}
                    </span>
                  </span>
                  {saved ? (
                    <span className="text-[10px] font-bold tracking-wide uppercase">
                      saved
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#14241c]">
              {unit.wing}
              {unit.unit}
              {unit.variant === "floor1" ? " · floor 1" : " · typical"}
            </h2>
            <p className="text-sm text-[#3d5247]">
              {unit.type} · {unit.facing === "W" ? "West" : "East"} ·{" "}
              {unit.areaSqft.toLocaleString()} sft · {unit.flats.length} flats
            </p>
          </div>
          <div
            className="inline-flex rounded-full bg-[rgba(27,58,47,0.08)] p-1"
            role="group"
            aria-label="Yard cell size"
          >
            {PITCHES.map((size) => {
              const next = yardGridForUnit(unit, size.yd);
              const active = cols === next.cols && rows === next.rows;
              return (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => {
                    source.current = "ui";
                    setPitchYd(size.yd);
                    setCols(next.cols);
                    setRows(next.rows);
                    setSelected(1);
                  }}
                  className={`min-h-9 rounded-full px-3 text-sm font-semibold ${
                    active
                      ? "bg-[#1b3a2f] text-[#e8d5a3]"
                      : "text-[#3d5247]"
                  }`}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-[#cfc7b8] p-2 ring-1 ring-[rgba(27,58,47,0.12)] md:p-3">
          <LayoutGrid
            unit={unit}
            grid={grid}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <p className="mt-2 text-xs text-[#3d5247]">
          Drawn in yard cells. Cell {cell.n} is {cell.contains} ·{" "}
          {cell.widthYd.toFixed(2)} yd × {cell.depthYd.toFixed(2)} yd.
        </p>
        <label className="mt-4 block text-xs font-semibold tracking-[0.14em] text-[#3d5247] uppercase">
          Prompt
          <textarea
            value={promptInput}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="Paste or type a design prompt. Example: cell 4: Kitchen · cell 12: Living"
            className="mt-2 min-h-48 w-full rounded-2xl border border-[rgba(27,58,47,0.12)] bg-[#fffcf5] px-3 py-3 font-mono text-xs font-normal normal-case tracking-normal text-[#14241c]"
          />
        </label>
      </section>

      <aside className="rounded-2xl bg-[#fffcf5] p-4 ring-1 ring-[rgba(27,58,47,0.12)]">
        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-[#7a5c22] uppercase">
          Cell {cell.n}
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div>
            <dt className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
              Stays
            </dt>
            <dd>
              Row {cell.row}, column {cell.col} · {cell.contains}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
              Size
            </dt>
            <dd>
              {cell.widthYd.toFixed(2)} yd × {cell.depthYd.toFixed(2)} yd
              <span className="text-[#3d5247]">
                {" "}
                ({cell.widthM.toFixed(2)}m × {cell.depthM.toFixed(2)}m)
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
              Sides
            </dt>
            <dd className="text-xs leading-relaxed">
              N {cell.north}
              <br />E {cell.east}
              <br />S {cell.south}
              <br />W {cell.west}
            </dd>
          </div>
        </dl>
        <label className="mt-3 block text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
          Contains
          <textarea
            value={cell.contains}
            onChange={(event) => {
              source.current = "ui";
              setOverrides((prev) => ({
                ...prev,
                [cell.n]: event.target.value,
              }));
            }}
            rows={3}
            className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#14241c]"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold tracking-[0.12em] text-[#3d5247] uppercase">
          Notes for this unit
          <textarea
            value={notes}
            onChange={(event) => {
              source.current = "ui";
              setNotes(event.target.value);
            }}
            rows={5}
            placeholder="Doors, windows, furniture, anything the later 2D pass must keep."
            className="mt-1 w-full rounded-xl border border-[rgba(27,58,47,0.12)] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#14241c]"
          />
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-11 rounded-full bg-[#1b3a2f] text-sm font-semibold text-[#e8d5a3] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save prompt file"}
          </button>
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="min-h-11 rounded-full bg-[rgba(27,58,47,0.08)] text-sm font-semibold text-[#1b3a2f]"
          >
            Copy prompt
          </button>
        </div>
        {message ? (
          <p className="mt-2 text-xs font-semibold text-[#2f5a48]">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs font-semibold text-[#8a2f2f]">{error}</p>
        ) : null}
        <p className="mt-3 text-xs text-[#3d5247]">
          Writes <code>data/design-prompts/{unit.key}.md</code>. Use that file
          later for the permanent 2D.
        </p>
      </aside>
    </div>
  );
}
