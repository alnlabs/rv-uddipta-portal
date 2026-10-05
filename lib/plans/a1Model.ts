/**
 * Flat A1, 3BHK-W, typical floors. One source for the 2D plan and the 3D model.
 * Brochure: 159546-rv-uddiipta-2903.pdf, page 12 (floors 5–10).
 *
 * Axes: origin at the south-west outer corner, +x east, +y north.
 * On that sheet, left is east and bottom is north, so the corridor entry is the west side.
 *
 * Printed room labels are clear sizes inside the walls.
 * First number of each "A x B" label is east–west. Second number is north–south.
 * That assignment was calibrated on the living room and checked on bedroom 14'4½".
 */

export const A1_WALL_THICKNESS = {
  /** Given for this model. Not printed on the plate. */
  outer: 0.75,
  inner: 0.375,
} as const;

const OUTER = A1_WALL_THICKNESS.outer;
const INNER = A1_WALL_THICKNESS.inner;

export const A1_META = {
  unit: "A1",
  type: "3BHK-W",
  carpetSft: 1314,
  balconySft: 222,
  superBuiltUpSft: 2152,
  floors: "typical floors 5–10",
} as const;

/** Feet. Living-room east–west label, measured between inner wall faces. */
export const A1_CALIBRATION = {
  primary: {
    label: 'LIVING/DRWING 12\'6" east–west',
    printedFt: 12.5,
    measuredPx: 278,
    renderZoom: 4,
    pxPerFt: 278 / 12.5,
  },
  check: {
    label: 'BEDROOM 14\'4½" east–west',
    printedFt: 14.375,
    predictedPx: (14.375 * 278) / 12.5,
    measuredPx: 317,
    deltaFt: 14.375 - (317 * 12.5) / 278,
  },
} as const;

export type A1Floor = "vitrified" | "anti-skid";

export type A1Point = { x: number; y: number };

export type A1Room = {
  id: string
  label: string
  /** Printed label, or null when the plate has no size. */
  printed: string | null
  floor: A1Floor
  /** Closed ring. Last point joins the first. Clear space inside the walls. */
  polygon: A1Point[]
  /** True when any edge length is not a printed label. */
  estimated: boolean
};

export type A1Wall = {
  id: string
  /** Centerline start. For a horizontal wall x1 < x2. For a vertical wall y1 < y2. */
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
  outer: boolean
};

export type A1Opening = {
  id: string
  kind: "door" | "window" | "balcony-door" | "cased"
  wallId: string
  /** Feet from the wall start (x1, y1) to the start of the opening. */
  offset: number
  width: number
  /** Hinge at the offset end, or at offset+width. Omitted for windows and cased openings. */
  hinge?: "start" | "end"
  /** Room the leaf swings into. */
  swingInto?: string
  estimated: boolean
};

export type A1Furniture = {
  id: string
  type: "bed" | "sofa" | "armchair" | "table" | "tv" | "counter" | "wardrobe" | "wc" | "basin"
  room: string
  x: number
  y: number
  width: number
  depth: number
  /** Degrees. 0 means width runs east and depth runs north. */
  rotation: number
  estimated: boolean
};

const bedSw: A1Point[] = [
  { x: 0.75, y: 0.75 },
  { x: 15.125, y: 0.75 },
  { x: 15.125, y: 13.25 },
  { x: 0.75, y: 13.25 },
];

const living: A1Point[] = [
  { x: 0.75, y: 13.625 },
  { x: 13.25, y: 13.625 },
  { x: 13.25, y: 31 },
  { x: 0.75, y: 31 },
];

const toiletSouth: A1Point[] = [
  { x: 15.5, y: 0.75 },
  { x: 21, y: 0.75 },
  { x: 21, y: 9.5 },
  { x: 15.5, y: 9.5 },
];

const toiletEast: A1Point[] = [
  { x: 21.375, y: 0.75 },
  { x: 25.625, y: 0.75 },
  { x: 25.625, y: 7.25 },
  { x: 21.375, y: 7.25 },
];

const kitchen: A1Point[] = [
  { x: 26, y: 0.75 },
  { x: 44.375, y: 0.75 },
  { x: 44.375, y: 17.625 },
  { x: 26, y: 17.625 },
];

/** 4 ft wide. Length is the kitchen depth left after the 6 ft puja and one inner wall. */
const utility: A1Point[] = [
  { x: 44.75, y: 0.75 },
  { x: 48.75, y: 0.75 },
  { x: 48.75, y: 11.25 },
  { x: 44.75, y: 11.25 },
];

/** 6 ft is north–south. 4 ft is east–west, in the same bay as the utility. */
const puja: A1Point[] = [
  { x: 44.75, y: 11.625 },
  { x: 48.75, y: 11.625 },
  { x: 48.75, y: 17.625 },
  { x: 44.75, y: 17.625 },
];

const dress: A1Point[] = [
  { x: 13.625, y: 18 },
  { x: 19.125, y: 18 },
  { x: 19.125, y: 22.5 },
  { x: 13.625, y: 22.5 },
];

const toiletNorth: A1Point[] = [
  { x: 13.625, y: 22.875 },
  { x: 19.125, y: 22.875 },
  { x: 19.125, y: 31 },
  { x: 13.625, y: 31 },
];

const bedNorth: A1Point[] = [
  { x: 19.5, y: 18 },
  { x: 32.875, y: 18 },
  { x: 32.875, y: 31 },
  { x: 19.5, y: 31 },
];

const bedEast: A1Point[] = [
  { x: 33.25, y: 18 },
  { x: 44.375, y: 18 },
  { x: 44.375, y: 31 },
  { x: 33.25, y: 31 },
];

/** L: east leg beside the 11'1½" bedroom, north leg in front of both north bedrooms. */
const balcony: A1Point[] = [
  { x: 19.5, y: 31.375 },
  { x: 44.75, y: 31.375 },
  { x: 44.75, y: 18 },
  { x: 49.75, y: 18 },
  { x: 49.75, y: 36.375 },
  { x: 19.5, y: 36.375 },
];

/**
 * Unlabeled floor between the kitchen, the two south toilets, and the north rooms.
 * The plate does not name it or size it. Bounds are the gaps left by printed rooms.
 */
const passage: A1Point[] = [
  { x: 13.625, y: 17.625 },
  { x: 26, y: 17.625 },
  { x: 26, y: 7.25 },
  { x: 21.375, y: 7.25 },
  { x: 21.375, y: 9.5 },
  { x: 15.5, y: 9.5 },
  { x: 15.5, y: 13.625 },
  { x: 13.625, y: 13.625 },
];

export const A1_ROOMS: A1Room[] = [
  { id: "bed-sw", label: "Bedroom", printed: '14\'4½"X12\'6"', floor: "vitrified", polygon: bedSw, estimated: false },
  { id: "living", label: "Living / Drawing", printed: '12\'6"X17\'4½"', floor: "vitrified", polygon: living, estimated: false },
  { id: "toilet-south", label: "Toilet", printed: '5\'6"X8\'9"', floor: "anti-skid", polygon: toiletSouth, estimated: false },
  { id: "toilet-east", label: "Toilet", printed: '4\'3"X6\'6"', floor: "anti-skid", polygon: toiletEast, estimated: false },
  { id: "kitchen", label: "Kitchen / Dining", printed: '18\'4½"X16\'10½"', floor: "vitrified", polygon: kitchen, estimated: false },
  { id: "utility", label: "Utility", printed: "4' WIDE", floor: "anti-skid", polygon: utility, estimated: true },
  { id: "puja", label: "Puja", printed: "6'X4'", floor: "vitrified", polygon: puja, estimated: false },
  { id: "dress", label: "Dress", printed: '5\'6"X4\'6"', floor: "vitrified", polygon: dress, estimated: false },
  { id: "toilet-north", label: "Toilet", printed: '5\'6"X8\'1½"', floor: "anti-skid", polygon: toiletNorth, estimated: false },
  { id: "bed-north", label: "Bedroom", printed: '13\'4½"X13\'', floor: "vitrified", polygon: bedNorth, estimated: false },
  { id: "bed-east", label: "Bedroom", printed: '11\'1½"X13\'', floor: "vitrified", polygon: bedEast, estimated: false },
  { id: "balcony", label: "Balcony", printed: "5' WIDE", floor: "anti-skid", polygon: balcony, estimated: true },
  { id: "passage", label: "Passage", printed: null, floor: "vitrified", polygon: passage, estimated: true },
];

function wall(id: string, x1: number, y1: number, x2: number, y2: number, outer: boolean): A1Wall {
  return { id, x1, y1, x2, y2, thickness: outer ? OUTER : INNER, outer };
}

export const A1_WALLS: A1Wall[] = [
  wall("south-outer", 0, 0.375, 49.5, 0.375, true),
  wall("west-outer", 0.375, 0, 0.375, 31.75, true),
  wall("north-living", 0, 31.375, 19.5, 31.375, true),
  wall("east-utility", 49.125, 0, 49.125, 18, true),
  wall("east-balcony", 50.125, 18, 50.125, 37.125, true),
  wall("north-balcony", 19.5, 36.75, 50.5, 36.75, true),
  wall("east-step", 49.125, 18, 50.125, 18, true),

  wall("bed-sw-north", 0.75, 13.4375, 15.125, 13.4375, false),
  wall("bed-sw-east", 15.3125, 0.75, 15.3125, 13.25, false),
  wall("toilet-south-east", 21.1875, 0.75, 21.1875, 9.5, false),
  wall("toilet-south-north", 15.5, 9.6875, 21, 9.6875, false),
  wall("toilet-east-north", 21.375, 7.4375, 25.625, 7.4375, false),
  wall("toilet-east-east", 25.8125, 0.75, 25.8125, 7.25, false),
  wall("kitchen-west", 25.8125, 7.25, 25.8125, 17.625, false),
  wall("kitchen-north", 26, 17.8125, 44.375, 17.8125, false),
  wall("utility-west", 44.5625, 0.75, 44.5625, 11.25, false),
  wall("utility-north", 44.75, 11.4375, 48.75, 11.4375, false),
  wall("puja-west", 44.5625, 11.625, 44.5625, 17.625, false),
  wall("puja-north", 44.75, 17.8125, 48.75, 17.8125, false),
  wall("living-east", 13.4375, 13.625, 13.4375, 31, false),
  wall("dress-south", 13.625, 17.8125, 19.125, 17.8125, false),
  wall("dress-east", 19.3125, 18, 19.3125, 22.5, false),
  wall("dress-north", 13.625, 22.6875, 19.125, 22.6875, false),
  wall("bed-north-west", 19.3125, 18, 19.3125, 31, false),
  wall("bed-north-east", 33.0625, 18, 33.0625, 31, false),
  wall("bed-east-south", 33.25, 17.8125, 44.375, 17.8125, false),
  wall("bed-north-south", 19.5, 17.8125, 32.875, 17.8125, false),
  wall("bed-north-north", 19.5, 31.1875, 32.875, 31.1875, false),
  wall("bed-east-north", 33.25, 31.1875, 44.375, 31.1875, false),
  wall("balcony-east-west", 44.5625, 18, 44.5625, 31, false),
];

export const A1_OPENINGS: A1Opening[] = [
  { id: "entry", kind: "door", wallId: "west-outer", offset: 24.5, width: 3.5, hinge: "end", swingInto: "living", estimated: true },
  { id: "utility", kind: "door", wallId: "utility-west", offset: 7.8, width: 2.5, hinge: "end", swingInto: "kitchen", estimated: true },
  { id: "puja", kind: "door", wallId: "puja-west", offset: 0.4, width: 2.5, hinge: "start", swingInto: "puja", estimated: true },
  { id: "toilet-east", kind: "door", wallId: "toilet-east-north", offset: 1.2, width: 2.5, hinge: "end", swingInto: "toilet-east", estimated: true },
  { id: "toilet-south", kind: "door", wallId: "toilet-south-north", offset: 0.4, width: 2.5, hinge: "start", swingInto: "toilet-south", estimated: true },
  { id: "bed-sw", kind: "door", wallId: "bed-sw-north", offset: 8.6, width: 3, hinge: "end", swingInto: "bed-sw", estimated: true },
  { id: "bed-east", kind: "door", wallId: "bed-east-south", offset: 6.4, width: 3, hinge: "start", swingInto: "bed-east", estimated: true },
  { id: "bed-north", kind: "door", wallId: "bed-north-south", offset: 1.2, width: 3, hinge: "end", swingInto: "bed-north", estimated: true },
  { id: "dress", kind: "door", wallId: "dress-east", offset: 0.4, width: 2.5, hinge: "start", swingInto: "dress", estimated: true },
  { id: "toilet-north", kind: "door", wallId: "dress-north", offset: 2.2, width: 2.5, hinge: "end", swingInto: "toilet-north", estimated: true },
  { id: "balcony-bed-east", kind: "balcony-door", wallId: "bed-east-north", offset: 0.5, width: 3, hinge: "start", swingInto: "bed-east", estimated: true },
  { id: "kitchen-passage", kind: "cased", wallId: "kitchen-west", offset: 0.8, width: 8.5, estimated: true },
  { id: "living-passage", kind: "cased", wallId: "living-east", offset: 0.3, width: 3.6, estimated: true },
  { id: "window-kitchen", kind: "window", wallId: "south-outer", offset: 30, width: 4, estimated: true },
  { id: "window-bed-sw", kind: "window", wallId: "south-outer", offset: 4, width: 5, estimated: true },
  { id: "window-utility", kind: "window", wallId: "east-utility", offset: 3, width: 3, estimated: true },
  { id: "window-bed-east", kind: "window", wallId: "balcony-east-west", offset: 4, width: 4, estimated: true },
];

export const A1_FURNITURE: A1Furniture[] = [
  { id: "bed-sw", type: "bed", room: "bed-sw", x: 4.2, y: 3.2, width: 6.5, depth: 5, rotation: 0, estimated: true },
  { id: "bed-north", type: "bed", room: "bed-north", x: 23, y: 22, width: 6.5, depth: 5, rotation: 0, estimated: true },
  { id: "bed-east", type: "bed", room: "bed-east", x: 36.5, y: 22, width: 5, depth: 6.5, rotation: 90, estimated: true },
  { id: "dining-table", type: "table", room: "kitchen", x: 32, y: 8, width: 4, depth: 3, rotation: 0, estimated: true },
  { id: "kitchen-counter", type: "counter", room: "kitchen", x: 42.2, y: 1.2, width: 2, depth: 10, rotation: 0, estimated: true },
  { id: "sofa", type: "sofa", room: "living", x: 2.2, y: 22, width: 6.5, depth: 2.6, rotation: 0, estimated: true },
  { id: "armchair-1", type: "armchair", room: "living", x: 9.2, y: 16, width: 2.4, depth: 2.4, rotation: 0, estimated: true },
  { id: "armchair-2", type: "armchair", room: "living", x: 9.2, y: 19.2, width: 2.4, depth: 2.4, rotation: 0, estimated: true },
  { id: "tv", type: "tv", room: "living", x: 2.4, y: 27.5, width: 4, depth: 0.6, rotation: 0, estimated: true },
  { id: "wardrobe", type: "wardrobe", room: "dress", x: 14, y: 18.4, width: 4.5, depth: 1.6, rotation: 0, estimated: true },
  { id: "wc-east", type: "wc", room: "toilet-east", x: 21.7, y: 1.1, width: 1.4, depth: 2.2, rotation: 0, estimated: true },
  { id: "basin-east", type: "basin", room: "toilet-east", x: 23.6, y: 5.4, width: 1.6, depth: 1.2, rotation: 0, estimated: true },
  { id: "wc-south", type: "wc", room: "toilet-south", x: 15.9, y: 1.1, width: 1.4, depth: 2.2, rotation: 0, estimated: true },
  { id: "basin-south", type: "basin", room: "toilet-south", x: 18.4, y: 1.1, width: 1.6, depth: 1.2, rotation: 0, estimated: true },
  { id: "wc-north", type: "wc", room: "toilet-north", x: 14, y: 23.3, width: 1.4, depth: 2.2, rotation: 0, estimated: true },
  { id: "basin-north", type: "basin", room: "toilet-north", x: 16.4, y: 23.3, width: 1.6, depth: 1.2, rotation: 0, estimated: true },
];

/** Every length that is not a printed label. */
export const A1_ESTIMATED = [
  "Outer wall thickness 0.75 ft and inner wall thickness 0.375 ft. Set for this model, not printed.",
  "Utility north–south length 10.5 ft. Only \"4' WIDE\" is printed. 10.5 is the kitchen depth left after the puja's 6 ft north–south side and one inner wall.",
  "Both balcony lengths. Only \"5' WIDE\" is printed on each leg. The east leg follows the 13 ft bedroom; the north leg spans both north bedrooms plus the east leg.",
  "Passage polygon. The plate has no name and no size for the floor between the kitchen, the south toilets, and the north rooms.",
  "Floor of the dress, puja, and passage treated as vitrified. The brief names vitrified only for living, bedrooms, and kitchen.",
  "Every door, window, balcony-door, and cased-opening width and offset.",
  "Main-door hinge. The leaf swings into the living room; the jamb is not sharp on the plate.",
  "Every furniture width, depth, position, and rotation.",
] as const;
