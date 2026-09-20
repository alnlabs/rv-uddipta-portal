/** Brochure inventory — 238 flats from RV Uddiipta area statements. */

const templates = require("../data/unit-templates.json");

const skip = new Set(
  templates.clubhouseSkip.map(([wing, unit]) => `${wing}${unit}`),
);

function formatFlatNumber(wing, floor, unit) {
  return `${wing}${floor}${String(unit).padStart(2, "0")}`;
}

function toFlat(floor, spec) {
  return {
    flatNumber: formatFlatNumber(spec.wing, floor, spec.unit),
    wing: spec.wing,
    floor,
    unit: spec.unit,
    type: spec.type,
    facing: spec.facing,
    areaSqft: spec.areaSqft,
  };
}

function buildFlats() {
  const flats = templates.floor1.map((spec) => toFlat(1, spec));

  for (let floor = 2; floor <= 10; floor += 1) {
    for (const spec of templates.typical) {
      if (floor <= 3 && skip.has(`${spec.wing}${spec.unit}`)) continue;
      flats.push(toFlat(floor, spec));
    }
  }

  if (flats.length !== 238) {
    throw new Error(`Expected 238 brochure flats, built ${flats.length}`);
  }

  return flats;
}

module.exports = { buildFlats };
