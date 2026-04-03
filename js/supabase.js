// Diamond IQ - Supabase Client
const DIQ_CONFIG = {
  SUPABASE_URL: 'https://czeagwgxecevijjpasgs.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZWFnd2d4ZWNldmlqanBhc2dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTYwMTksImV4cCI6MjA5MDczMjAxOX0.osM-gBBbit9PBPDUk1saOsFfYNDafOrP6LK36Uesg5c'
};

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(DIQ_CONFIG.SUPABASE_URL, DIQ_CONFIG.SUPABASE_KEY);
  }
  return _supabase;
}
