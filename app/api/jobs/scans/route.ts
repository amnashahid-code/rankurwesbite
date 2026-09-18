import { NextResponse } from 'next/server';
import { api,equalSecret,HttpError } from '@/lib/security/http';
import { runScan } from '@/lib/analyzer/worker';
import { adminDb } from '@/lib/supabase/server';
export const maxDuration=180;
export async function GET(req:Request){return api(async()=>{if(!process.env.CRON_SECRET||!equalSecret(req.headers.get('authorization')||'',`Bearer ${process.env.CRON_SECRET}`))throw new HttpError(401,'Unauthorized.');const {error}=await adminDb().rpc('maintain_platform');if(error)throw error;const completed=await runScan();return NextResponse.json({processed:completed});});}
