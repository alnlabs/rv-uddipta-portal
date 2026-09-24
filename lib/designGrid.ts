import templates from "@/data/unit-templates.json";
import { formatFlatNumber } from "@/lib/flatNumber";
import { planForFlat, type FlatPlan, type FlatPlanInput } from "@/lib/flatPlan";
import { INVENTORY } from "@/lib/inventory";

export type DesignUnit = {
  key: string
  wing: "A" | "B"
  unit: number
  type: "2BHK" | "3BHK"
  facing: "E" | "W"
  areaSqft: number
  variant: "typical" | "floor1"
  flats: string[]
};

export type GridCell = {
  n: number
  row: number
  col: number
  x: number
  y: number
  w: number
  h: number
  widthM: number
  depthM: number
  widthYd: number
  depthYd: number
  north: string
  east: string
  south: string
  west: string
  contains: string
};

export type DesignGrid = {
  cols: number
  rows: number
  cellW: number
  cellH: number
  widthYd: number
  depthYd: number
  cells: GridCell[]
};

const CLUBHOUSE = new Set(
  templates.clubhouseSkip.map(([wing, unit]) => `${wing}${unit}`),
);

function flatsFor(wing: "A" | "B", unit: number, variant: DesignUnit["variant"]) {
  if (variant === "floor1") return [formatFlatNumber(wing, 1, unit)];
  const numbers: string[] = [];
  for (let floor = 2; floor <= 10; floor += 1) {
    if (floor <= 3 && CLUBHOUSE.has(`${wing}${unit}`)) continue;
    numbers.push(formatFlatNumber(wing, floor, unit));
  }
  return numbers;
}

export function listDesignUnits(): DesignUnit[] {
  const typical = templates.typical.map((spec) => ({
    key: `${spec.wing}${spec.unit}`,
    wing: spec.wing as "A" | "B",
    unit: spec.unit,
    type: spec.type as "2BHK" | "3BHK",
    facing: spec.facing as "E" | "W",
    areaSqft: spec.areaSqft,
    variant: "typical" as const,
    flats: flatsFor(spec.wing as "A" | "B", spec.unit, "typical"),
  }));

  const floor1 = templates.floor1.map((spec) => ({
    key: `${spec.wing}${spec.unit}-floor1`,
    wing: spec.wing as "A" | "B",
    unit: spec.unit,
    type: spec.type as "2BHK" | "3BHK",
    facing: spec.facing as "E" | "W",
    areaSqft: spec.areaSqft,
    variant: "floor1" as const,
    flats: flatsFor(spec.wing as "A" | "B", spec.unit, "floor1"),
  }));

  return [...typical, ...floor1];
}

export function findDesignUnit(key: string) {
  return listDesignUnits().find((unit) => unit.key === key) ?? null;
}

export function designUnitToPlanInput(unit: DesignUnit): FlatPlanInput {
  const sample = INVENTORY.find(
    (flat) =>
      flat.wing === unit.wing &&
      flat.unit === unit.unit &&
      (unit.variant === "floor1" ? flat.floor === 1 : flat.floor >= 2),
  );
  return {
    flatNumber: sample?.flatNumber ?? `${unit.wing}${unit.unit}`,
    wing: unit.wing,
    floor: sample?.floor ?? (unit.variant === "floor1" ? 1 : 2),
    unit: unit.unit,
    type: unit.type,
    facing: unit.facing,
    areaSqft: unit.areaSqft,
  };
}

/** ~11 m along the 100-unit plan depth — brochure typical. */
const METERS_PER_UNIT = 0.11;
export const YARD_M = 0.9144;
/** SVG size of one yard cell. */
export const YARD_CELL = 10;

export function roomKey(contains: string) {
  return (contains.split("·")[0] ?? contains).trim();
}

export function yardExtent(unit: DesignUnit) {
  const plan = planForFlat(designUnitToPlanInput(unit));
  return {
    widthYd: (plan.width * METERS_PER_UNIT) / YARD_M,
    depthYd: (plan.height * METERS_PER_UNIT) / YARD_M,
  };
}

export function yardGridForUnit(unit: DesignUnit, pitchYd = 1) {
  const { widthYd, depthYd } = yardExtent(unit);
  const pitch = pitchYd > 0 ? pitchYd : 1;
  return {
    cols: Math.max(4, Math.round(widthYd / pitch)),
    rows: Math.max(4, Math.round(depthYd / pitch)),
    pitchYd: pitch,
    widthYd,
    depthYd,
  };
}

function sideLabel(
  row: number,
  col: number,
  rows: number,
  cols: number,
  facing: "E" | "W",
  dir: "N" | "E" | "S" | "W",
) {
  const dr = dir === "N" ? -1 : dir === "S" ? 1 : 0;
  const dc = dir === "W" ? -1 : dir === "E" ? 1 : 0;
  const nextRow = row + dr;
  const nextCol = col + dc;
  if (nextRow < 1) return "outside (north flank)";
  if (nextRow > rows) return "outside (south flank)";
  if (nextCol < 1) {
    return facing === "W"
      ? "west facing / balcony / outside"
      : "corridor / entry";
  }
  if (nextCol > cols) {
    return facing === "W"
      ? "corridor / entry"
      : "east facing / balcony / outside";
  }
  return `cell ${(nextRow - 1) * cols + nextCol}`;
}

function contentsAt(plan: FlatPlan, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const room = plan.rooms.find(
    (item) =>
      cx >= item.x &&
      cx <= item.x + item.w &&
      cy >= item.y &&
      cy <= item.y + item.h,
  );
  const bits = plan.furniture
    .filter(
      (item) =>
        item.x < x + w &&
        item.x + item.w > x &&
        item.y < y + h &&
        item.y + item.h > y,
    )
    .map((item) => item.kind);
  const unique = [...new Set(bits)];
  if (!room && !unique.length) return "empty / wall";
  return [room?.label, unique.length ? unique.join(", ") : null]
    .filter(Boolean)
    .join(" · ");
}

export function buildDesignGrid(
  unit: DesignUnit,
  cols: number,
  rows: number,
  overrides: Record<number, string> = {},
): DesignGrid {
  const plan = planForFlat(designUnitToPlanInput(unit));
  const { widthYd, depthYd } = yardExtent(unit);
  const planW = plan.width / cols;
  const planH = plan.height / rows;
  const cellWyd = widthYd / cols;
  const cellHyd = depthYd / rows;
  const cells: GridCell[] = [];

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const n = (row - 1) * cols + col;
      const planX = (col - 1) * planW;
      const planY = (row - 1) * planH;
      cells.push({
        n,
        row,
        col,
        x: (col - 1) * YARD_CELL,
        y: (row - 1) * YARD_CELL,
        w: YARD_CELL,
        h: YARD_CELL,
        widthM: cellWyd * YARD_M,
        depthM: cellHyd * YARD_M,
        widthYd: cellWyd,
        depthYd: cellHyd,
        north: sideLabel(row, col, rows, cols, unit.facing, "N"),
        east: sideLabel(row, col, rows, cols, unit.facing, "E"),
        south: sideLabel(row, col, rows, cols, unit.facing, "S"),
        west: sideLabel(row, col, rows, cols, unit.facing, "W"),
        contains: overrides[n] ?? contentsAt(plan, planX, planY, planW, planH),
      });
    }
  }

  return {
    cols,
    rows,
    cellW: YARD_CELL,
    cellH: YARD_CELL,
    widthYd,
    depthYd,
    cells,
  };
}

export type PromptPayload = {
  unit: DesignUnit
  grid: DesignGrid
  notes: string
};

export function buildDesignPrompt({ unit, grid, notes }: PromptPayload) {
  const baths = unit.type === "2BHK" ? "2 BHK + 2T" : "3 BHK + 3T";
  const face = unit.facing === "W" ? "west" : "east";
  const variant =
    unit.variant === "floor1" ? "first-floor plate" : "typical floors 2–10";
  const cellLines = grid.cells
    .map((cell) => {
      const size = `${cell.widthYd.toFixed(2)} yd × ${cell.depthYd.toFixed(2)} yd`;
      return `${cell.n}. row ${cell.row} col ${cell.col} · yard (${cell.col}, ${cell.row}) · size ${size} · N ${cell.north} · E ${cell.east} · S ${cell.south} · W ${cell.west} · contains: ${cell.contains}`;
    })
    .join("\n");

  return `# 2D design prompt — ${unit.key}

Draw a permanent brochure-accurate architectural 2D floor plan for RV Uddiipta unit ${unit.wing}${unit.unit}.

## Unit
- Key: ${unit.key}
- Type: ${baths}
- Facing: ${face}
- Super built-up: ${unit.areaSqft.toLocaleString()} sft
- Plate: ${variant}
- Applies to flats: ${unit.flats.join(", ")}
- Entry is from the corridor. Living, sit-outs and balconies sit on the ${face} facade.
- Kitchen + utility sit with dining. Wet rooms are toilets / utility.

## Numbered grid
Draw the plan on yard paper: ${grid.cols} columns × ${grid.rows} rows = ${grid.cells.length} square yard cells.
Plate is about ${grid.widthYd.toFixed(1)} yd wide × ${grid.depthYd.toFixed(1)} yd deep.
Numbering starts at 1, left to right, then the next row down.
Column 1 is the ${unit.facing === "W" ? "west / facing" : "corridor / entry"} edge.
Column ${grid.cols} is the ${unit.facing === "W" ? "corridor / entry" : "east / facing"} edge.
Row 1 is the north flank. Row ${grid.rows} is the south flank.
Each cell is about ${grid.cells[0]?.widthYd.toFixed(2)} yd × ${grid.cells[0]?.depthYd.toFixed(2)} yd.

## Cells
${cellLines}

## Designer notes
${notes.trim() || "(none yet — add room names, furniture, doors, and windows here)"}

## How to draw
- Cream rooms, grey wet areas, tan balconies.
- Thick outer walls, thinner inner walls, door swings, window marks on the facing wall.
- Furniture as in a typical RV Uddiipta brochure plan (beds, sofa, dining, kitchen counter).
- Label every room. This is a typical layout, not a sale drawing.
- Do not invent extra bedrooms or toilets beyond ${baths}.

\`\`\`json
${JSON.stringify(
    {
      key: unit.key,
      cols: grid.cols,
      rows: grid.rows,
      notes,
      cells: Object.fromEntries(
        grid.cells.map((cell) => [cell.n, cell.contains]),
      ),
    },
    null,
    2,
  )}
\`\`\`
`;
}

export type PromptState = {
  key?: string
  cols: number
  rows: number
  notes: string
  cells: Record<number, string>
  hasNotes: boolean
  hasGrid: boolean
};

function parseJsonBlock(markdown: string): Partial<PromptState> | null {
  const match = markdown.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]) as {
      key?: string
      cols?: number
      rows?: number
      notes?: string
      cells?: Record<string, string>
    };
    const cells: Record<number, string> = {};
    for (const [id, value] of Object.entries(data.cells ?? {})) {
      const n = Number(id);
      if (Number.isFinite(n) && value) cells[n] = value;
    }
    return {
      key: data.key,
      cols: data.cols,
      rows: data.rows,
      notes: data.notes,
      cells,
    };
  } catch {
    return null;
  }
}

function parseCellLines(markdown: string) {
  const cells: Record<number, string> = {};
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const numbered = line.match(
      /^\s*(\d+)\.\s+.*?contains:\s*(.+?)\s*$/i,
    );
    const short = line.match(
      /^\s*(?:cell\s*)?(\d+)\s*(?:[:-=]|contains)\s+(.+?)\s*$/i,
    );
    const hit = numbered || short;
    if (!hit) continue;
    const n = Number(hit[1]);
    const value = hit[2].trim();
    if (Number.isFinite(n) && value) cells[n] = value;
  }
  return cells;
}

export function parsePromptState(markdown: string): PromptState | null {
  const text = markdown.trim();
  if (!text) return null;

  const json = parseJsonBlock(text);
  const withoutJson = text.replace(/```json\n[\s\S]*?\n```/g, "");
  const fromLines = parseCellLines(withoutJson);
  const keyMatch =
    text.match(/#\s*2D design prompt\s+[—-]\s*([AB]\d{1,2}(?:-floor1)?)/i) ||
    text.match(/[-*]\s*Key:\s*([AB]\d{1,2}(?:-floor1)?)/i);
  const gridMatch = text.match(
    /(\d+)\s*columns?\s*[×x]\s*(\d+)\s*rows?/i,
  );
  const notesMatch = text.match(
    /##\s*Designer notes\n([\s\S]*?)(?:\n##\s|\n```|$)/i,
  );

  // Visible cell lines win over the trailing JSON so live typing applies.
  const cells = { ...(json?.cells ?? {}), ...fromLines };
  const cols = json?.cols ?? (gridMatch ? Number(gridMatch[1]) : 8);
  const rows = json?.rows ?? (gridMatch ? Number(gridMatch[2]) : 6);
  const notes = (json?.notes ?? notesMatch?.[1] ?? "").trim();
  const key = json?.key ?? keyMatch?.[1];
  const hasNotes = json?.notes != null || Boolean(notesMatch);
  const hasGrid = json?.cols != null || json?.rows != null || Boolean(gridMatch);

  if (!key && !Object.keys(cells).length && !hasNotes && !hasGrid) {
    return {
      cols,
      rows,
      notes: text,
      cells,
      hasNotes: true,
      hasGrid: false,
    };
  }

  return {
    key,
    cols: Number.isFinite(cols) && cols > 0 ? cols : 8,
    rows: Number.isFinite(rows) && rows > 0 ? rows : 6,
    notes,
    cells,
    hasNotes,
    hasGrid,
  };
}

export function cellFill(contains: string) {
  const text = contains.toLowerCase();
  if (text.includes("balc") || text.includes("sit-out")) return "#d2c09a";
  if (
    text.includes("bath") ||
    text.includes("toilet") ||
    text.includes("util")
  ) {
    return "#d7e0e7";
  }
  if (text.includes("kitchen")) return "#f6e6d4";
  if (text.includes("bed") || text.includes("master") || text.includes("dress")) {
    return "#efe4d2";
  }
  if (text.includes("living") || text.includes("dining")) return "#e8f0ea";
  if (text.includes("foyer") || text.includes("entry")) return "#f3ead8";
  if (text.includes("empty") || text.includes("wall")) return "#efe8d8";
  return "#f7f2e6";
}
