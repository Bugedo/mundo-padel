'use client';

import { createBrowserClient } from '@supabase/ssr';

// Create a Supabase browser client for use in client components
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default supabase;
