import type { SupabaseClient } from '@supabase/supabase-js'

declare module '@supabase/ssr' {
  export function createServerClient(
    url: string,
    key: string,
    options?: any
  ): SupabaseClient
}
