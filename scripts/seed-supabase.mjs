import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const require = createRequire(import.meta.url);
const { buildFlats } = require("./owners.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

loadEnv(path.join(root, ".env.local"));
loadEnv(path.join(root, ".env"));

const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
Missing service role key. Add this to .env.local (seed only, never the browser):

  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

async function seed() {
  const flats = buildFlats();
  console.log(`Replacing board with ${flats.length} brochure flats in ${url}`);

  const { error: deleteError } = await supabase.from("flats").delete().neq("id", 0);
  if (deleteError) throw new Error(`Could not clear old flats: ${deleteError.message}`);

  const rows = flats.map((flat) => ({
    flat_number: flat.flatNumber,
    wing: flat.wing,
    floor: flat.floor,
    unit: flat.unit,
    type: flat.type,
    facing: flat.facing,
    area_sqft: flat.areaSqft,
    owner_name: null,
    phone: null,
    user_id: null,
    sale_status: "unsold",
    occupancy: null,
    tenant_name: null,
    tenant_phone: null,
    registration: "pending",
    interior: "not_started",
    ceremony: "pending",
    moving: "pending",
  }));

  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("flats").insert(chunk);
    if (error) throw new Error(`Insert failed at ${chunk[0].flat_number}: ${error.message}`);
    process.stdout.write(".");
  }

  console.log(`\nSeeded ${flats.length} vacant flats from the brochure. Owners claim them after admin approval.`);
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

seed().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
