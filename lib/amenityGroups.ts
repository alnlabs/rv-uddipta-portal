export type AmenityGroup = {
  title: "Play" | "Exercise" | "Gather" | "Safety"
  items: string[]
};

const PLAY = /play|cricket|basketball/i;
const EXERCISE = /gym|jog|walk/i;
const SAFETY = /security|door phone|charging|solar|stp|water/i;

export function groupAmenities(items: string[]): AmenityGroup[] {
  const groups: Record<AmenityGroup["title"], string[]> = {
    Play: [],
    Exercise: [],
    Gather: [],
    Safety: [],
  };

  for (const item of items) {
    if (PLAY.test(item)) groups.Play.push(item);
    else if (EXERCISE.test(item)) groups.Exercise.push(item);
    else if (SAFETY.test(item)) groups.Safety.push(item);
    else groups.Gather.push(item);
  }

  return (["Play", "Exercise", "Gather", "Safety"] as const)
    .map((title) => ({ title, items: groups[title] }))
    .filter((group) => group.items.length > 0);
}
