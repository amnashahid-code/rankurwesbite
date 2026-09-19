import { NextResponse } from 'next/server';
import { brand } from '@/lib/config';
export async function GET(_req:Request,{params}:{params:Promise<{code:string}>}){const {code}=await params;const response=NextResponse.redirect(new URL('/auth/sign-up',brand.domain));if(/^[a-f0-9]{18}$/.test(code))response.cookies.set('ryw_ref',code,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*86400,path:'/'});return response;}
