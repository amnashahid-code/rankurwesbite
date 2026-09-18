import { NextResponse } from 'next/server';
import { sessionDb } from '@/lib/supabase/server';
import { brand } from '@/lib/config';
import { safeNextPath } from '@/lib/auth/redirect';
export async function GET(req:Request){
 const url=new URL(req.url);const hash=url.searchParams.get('token_hash');const type=url.searchParams.get('type');
 try {if(hash&&(type==='signup'||type==='recovery'||type==='email')){const db=await sessionDb();const {error}=await db.auth.verifyOtp({token_hash:hash,type});if(!error)return NextResponse.redirect(new URL(type==='recovery'?'/auth/reset-password':safeNextPath(url.searchParams.get('next')),brand.domain));}}
 catch { /* Do not expose provider errors or tokens in the redirect. */ }
 return NextResponse.redirect(new URL('/auth/sign-in?error=verification',brand.domain));
}
