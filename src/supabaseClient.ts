import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xcnrxygiipslzouqqttn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbnJ4eWdpaXBzbHpvdXFxdHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODUwMjAsImV4cCI6MjA5MTM2MTAyMH0.jAgvvV1vS7UQqQDELAWObxeSy0xOb8fFwigP7YnKeUs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
