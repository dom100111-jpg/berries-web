import { createClient } from "@supabase/supabase-js";

console.log("WEB SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "WEB SERVICE ROLE START:",
  process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)
);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);