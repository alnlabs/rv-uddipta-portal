/**
 * Import floor-wise owner list from data/owners-floor-wise.json into Supabase.
 * Sets owner_name + phone on matching flats; co-owners go into flat_members.
 * Preserves existing user_id links. Does not wipe vacant flats.
 *
 * Source: RV_UDDIIPTA_Owners_Floor_Wise.pdf (58 flats with numbers; 7 skipped incomplete).
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

loadEnv(path.join(root, ".env.local"));
loadEnv(path.join(root, ".env"));

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
});

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  const phone =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  return /^\d{10}$/.test(phone) ? phone : null;
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

function primaryPhone(owners) {
  for (const owner of owners) {
    for (const raw of owner.phones ?? []) {
      const phone = normalizePhone(raw);
      if (phone) return phone;
    }
  }
  return null;
}

async function importOwners() {
  const list = JSON.parse(
    readFileSync(path.join(root, "data/owners-floor-wise.json"), "utf8"),
  );

  console.log(`Importing ${list.length} flats with owners into ${url}`);

  let updated = 0;
  let membersInserted = 0;
  const missing = [];
  const phoneSkipped = [];

  for (const entry of list) {
    const flatNumber = entry.flatNumber;
    const owners = entry.owners ?? [];
    if (!owners.length) {
      missing.push(flatNumber);
      continue;
    }

    const primary = owners[0];
    const phone = primaryPhone(owners);
    if (!phone && (primary.phones?.length ?? 0) > 0) {
      phoneSkipped.push(flatNumber);
    }

    const { data: flat, error: loadError } = await supabase
      .from("flats")
      .select("id, flat_number, user_id, phone")
      .eq("flat_number", flatNumber)
      .maybeSingle();

    if (loadError) throw new Error(`${flatNumber}: ${loadError.message}`);
    if (!flat) {
      missing.push(flatNumber);
      console.warn(`  skip ${flatNumber} — not in brochure inventory`);
      continue;
    }

    const patch = {
      owner_name: primary.name.trim(),
      sale_status: "sold",
      occupancy: "owner_stay",
      tenant_name: null,
      tenant_phone: null,
      open_for_rent: false,
      open_for_resale: false,
    };
    // Keep linked account phone if already set; otherwise use list phone.
    if (phone && (!flat.user_id || !flat.phone)) {
      patch.phone = phone;
    } else if (phone && flat.phone !== phone && !flat.user_id) {
      patch.phone = phone;
    } else if (phone && flat.user_id && flat.phone === phone) {
      // already correct
    } else if (phone && flat.user_id && flat.phone !== phone) {
      // Linked account: update name only; leave phone as-is to avoid auth mismatch.
      console.warn(
        `  ${flatNumber}: linked user — keeping phone ${flat.phone}, PDF has ${phone}`,
      );
    }

    const { error: updateError } = await supabase
      .from("flats")
      .update(patch)
      .eq("id", flat.id);

    if (updateError) {
      throw new Error(`${flatNumber} update: ${updateError.message}`);
    }
    updated += 1;

    // Replace co-owner members for this flat (idempotent re-import).
    const coOwners = owners.slice(1);
    await supabase.from("flat_members").delete().eq("flat_id", flat.id);

    if (coOwners.length) {
      const rows = coOwners.map((owner, index) => ({
        flat_id: flat.id,
        name: owner.name.trim(),
        relation: "other",
        phone: normalizePhone(owner.phones?.[0] ?? null),
        sort_order: index,
      }));
      const { error: memberError } = await supabase
        .from("flat_members")
        .insert(rows);
      if (memberError) {
        throw new Error(`${flatNumber} members: ${memberError.message}`);
      }
      membersInserted += rows.length;
    }

    // If primary had only a non-IN phone but a co-owner has IN phone, primary phone already handled.
    // If primary has IN phone and also extras on primary.phones[1+], store extras as members? Skip — rare.

    process.stdout.write(".");
  }

  console.log(`\nUpdated ${updated} flats, inserted ${membersInserted} household members.`);
  if (missing.length) console.log(`Missing inventory flats: ${missing.join(", ")}`);
  if (phoneSkipped.length) {
    console.log(
      `No 10-digit IN phone (name still set): ${phoneSkipped.join(", ")}`,
    );
  }
}

importOwners().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
