import { NextResponse } from 'next/server';
import { sessionDb } from '@/lib/supabase/server';
import { brand } from '@/lib/config';
import { safeNextPath } from '@/lib/auth/redirect';
export async function GET(req:Request){
 const url=new URL(req.url);const code=url.searchParams.get('code');
 try {if(code){const db=await sessionDb();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get('next')),brand.domain));}}
 catch { /* Invalid configuration or expired sessions return to the recovery UI. */ }
 return NextResponse.redirect(new URL('/auth/sign-in?error=verification',brand.domain));
}
