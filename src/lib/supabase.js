import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uydyxhpowawyioqxtfcm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZHl4aHBvd2F3eWlvcXh0ZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDExNjUsImV4cCI6MjEwNjA3NzE2NX0.IOzdQrAWMkjssIqqwXb9a5vvJyJTP4y4A7HjJUQ8y98";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);