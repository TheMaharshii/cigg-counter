// Tapri Supabase configuration
// NEVER put the Supabase Secret key here.

window.TAPRI_CONFIG = {
    SUPABASE_URL: "https://hsenslxpyuaxmdgjzklv.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_KyxP228X516cWfj8UknO_g_pdG6HnPt"
};

window.supabaseClient = window.supabase.createClient(
    window.TAPRI_CONFIG.SUPABASE_URL,
    window.TAPRI_CONFIG.SUPABASE_PUBLISHABLE_KEY
);