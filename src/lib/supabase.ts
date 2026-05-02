import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pvclnwklaliugwsrrdvd.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_FF9KXFPYBy5yDp8ph2JQpQ_lIRQfUhi";

export const supabase = createClient(supabaseUrl, supabaseKey);
