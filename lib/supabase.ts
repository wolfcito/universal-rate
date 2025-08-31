import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. Uses service role for secure inserts from API routes.
let serverClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for server client",
    );
  }

  serverClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}

// Optional anon client for client-side reads if we later expose public views.
let anonClient: SupabaseClient | null = null;
export function getSupabaseAnon(): SupabaseClient {
  if (anonClient) return anonClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars for anon client",
    );
  }
  anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return anonClient;
}

