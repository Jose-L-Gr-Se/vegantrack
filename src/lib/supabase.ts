import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hsxqwhsyqtdaenjxlhzo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeHF3aHN5cXRkYWVuanhsaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjU3NTEsImV4cCI6MjA4OTM0MTc1MX0.Gz6_QG7ehy4db6j4Lf6WI5C_OE61qGgIyrAF1UAl7vo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
