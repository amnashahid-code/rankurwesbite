import { NextResponse } from 'next/server';
import { api } from '@/lib/security/http';
import { getStats } from '@/lib/data';
export async function GET(){return api(async()=>NextResponse.json(await getStats(),{headers:{'Cache-Control':'public, s-maxage=30, stale-while-revalidate=30'}}));}
