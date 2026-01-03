
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://fgtgthqlbxxforoevhpo.supabase.co';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndGd0aHFsYnh4Zm9yb2V2aHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjQxOTgsImV4cCI6MjA4MjI0MDE5OH0.LMsF0DwbuJZxLFYznIgzgc-v3Q4VxhIRGBHgAGCb7ZI';

export const supabase = createClient(supabaseUrl, supabaseKey);
