import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api,body,HttpError,originCheck,rateLimit } from '@/lib/security/http';
import { sessionDb } from '@/lib/supabase/server';
import { brand } from '@/lib/config';
export async function POST(req:Request){return api(async()=>{originCheck(req);await rateLimit(req,'signup',5);const input=z.object({email:z.email(),password:z.string().min(12).max(128),firstName:z.string().trim().min(1).max(80),captchaToken:z.string().optional()}).parse(await body(req));const ref=(await cookies()).get('ryw_ref')?.value;const db=await sessionDb();const {error}=await db.auth.signUp({email:input.email,password:input.password,options:{emailRedirectTo:`${brand.domain}/auth/callback`,captchaToken:input.captchaToken,data:{first_name:input.firstName,referral_code:ref||null}}});if(error)throw new HttpError(400,error.message);return NextResponse.json({message:'Check your email to verify your account. If this address is already registered, sign in instead.'});});}
