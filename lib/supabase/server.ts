import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function configured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY); }
export async function sessionDb() {
 const jar = await cookies();
 if (!configured()) throw new Error('Database is not configured. See the setup guide.');
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  cookies: { getAll: () => jar.getAll(), setAll: (values) => { try { values.forEach(({name,value,options}) => jar.set(name,value,options)); } catch { /* Server Component: proxy refreshes cookies. */ } } },
 });
}
export function adminDb() {
 if (!configured()) throw new Error('Database is not configured. See the setup guide.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{ auth: { persistSession:false, autoRefreshToken:false } });
}
