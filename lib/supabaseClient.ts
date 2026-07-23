'use client';

import { createClient } from '@/utils/supabase/client';

// Browser client singleton for client components
const supabase = createClient();

export default supabase;
