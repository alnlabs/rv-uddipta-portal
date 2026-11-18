import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { LABEL_DEFAULTS, type SocietyLabels } from "@/lib/labelDefaults";

export { LABEL_DEFAULTS, t, type SocietyLabels } from "@/lib/labelDefaults";

export async function loadSocietyLabels(): Promise<SocietyLabels> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.rpc("list_society_labels");
    if (error || !data || typeof data !== "object") {
      return { ...LABEL_DEFAULTS };
    }
    return { ...LABEL_DEFAULTS, ...(data as SocietyLabels) };
  } catch {
    return { ...LABEL_DEFAULTS };
  }
}
