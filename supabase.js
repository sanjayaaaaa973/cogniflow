import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rilzkwgqoglalduuavzx.supabase.co";
const SUPABASE_KEY = "sb_publishable_loqF3rjOlYuzhLqhnlYQWA_N4VHRQai";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);