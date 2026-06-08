import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xuheavrmrhpcscogidct.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aGVhdnJtcmhwY3Njb2dpZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDIzOTgsImV4cCI6MjA5NjQ3ODM5OH0.mKePxWN7AihA4onZ2kmOxa6VHgXWysFScYKe0L7OvMg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('lecturers').select('*');
  console.log("Lecturers:", data);
  if (error) console.error("Error:", error);
}

test();
