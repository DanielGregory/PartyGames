import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Uses the service-role key, which bypasses Row Level Security entirely.
// Only ever import this from server-side code (API routes) — never from a
// client component. The `server-only` import above turns an accidental
// client-side import into a build error.
export function getSupabaseServerClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return client;
}
