import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { api } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
const growth=unstable_cache(async()=>{const {data,error}=await adminDb().rpc('public_growth');if(error)throw error;return data;},['public-growth'],{revalidate:60});
export async function GET(){return api(async()=>NextResponse.json(await growth(),{headers:{'Cache-Control':'public, s-maxage=60'}}));}
