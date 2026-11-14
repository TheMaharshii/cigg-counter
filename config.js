// Supabase configuration for Tapri.
// Use your Supabase Project URL and Publishable key here.
// NEVER put the Supabase Secret / service-role key in this file.

const SUPABASE_URL = "https://hsenslxpyuaxmdgjzklv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
