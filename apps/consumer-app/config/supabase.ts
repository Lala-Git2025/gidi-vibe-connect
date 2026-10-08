import { createClient } from '@supabase/supabase-js';

// Supabase configuration.
// Exported because lib/uploadFile.ts talks to the Storage REST endpoint
// directly — supabase-js has no streaming upload path, so large media has to
// bypass it. See that file for why.
export const SUPABASE_URL = 'https://xvtjcpwkrsoyrhhptdmc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dGpjcHdrcnNveXJoaHB0ZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzEyNDUsImV4cCI6MjA3MTQwNzI0NX0.F8Qbp8zUNVi0ONWsIxFJcWrRmVIFJuah8tEBf92K160';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
