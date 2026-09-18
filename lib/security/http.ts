import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { adminDb, configured, sessionDb } from '@/lib/supabase/server';
import { brand } from '@/lib/config';
import type { ScanRow } from '@/types';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const uuid = z.string().uuid();
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function equalSecret(a: string, b: string) { const x=Buffer.from(a); const y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); }
export function originCheck(req: Request) {
 const origin=req.headers.get('origin');
 if (!origin || origin !== new URL(brand.domain).origin) throw new HttpError(403,'Request origin is not allowed.');
}
export async function body(req: Request) {
 if (Number(req.headers.get('content-length')||0)>16384) throw new HttpError(413,'Request is too large.');
 const reader=req.body?.getReader(); if (!reader) throw new HttpError(400,'Request body is required.');
 const chunks: Uint8Array[]=[]; let size=0;
 for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>16384){await reader.cancel();throw new HttpError(413,'Request is too large.');} chunks.push(value); }
 try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400,'Invalid JSON.'); }
}
export async function api(fn: () => Promise<Response>) {
 try { if(!configured()) throw new HttpError(503,'Service setup is not complete. Please try again later.'); return await fn(); }
 catch(e) { if(e instanceof ZodError) return NextResponse.json({error:e.issues[0]?.message||'Invalid input.'},{status:400}); if(e instanceof HttpError) return NextResponse.json({error:e.message},{status:e.status}); console.error('Request failed:',e instanceof Error ? e.message : 'Database operation failed'); return NextResponse.json({error:'We could not complete this request. Please try again.'},{status:500}); }
}
export async function currentUser() { if(!configured()) return null; const db=await sessionDb(); const {data:{user}}=await db.auth.getUser(); return user; }
export async function requireUser() { const user=await currentUser(); if(!user) throw new HttpError(401,'Please sign in to continue.'); return user; }
export async function requireAdmin() { const user=await requireUser(); const {data,error}=await adminDb().from('profiles').select('is_admin').eq('id',user.id).single(); if(error||!data?.is_admin) throw new HttpError(403,'Administrator access required.'); return user; }
export async function guestToken(create=false) { const jar=await cookies(); let token=jar.get('ryw_scan')?.value; if(!token && create) { token=randomBytes(32).toString('hex');jar.set('ryw_scan',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:86400}); } return token; }
export async function ownedScan(id: string) {
 uuid.parse(id); const user=await currentUser(); const token=await guestToken();
 const {data,error}=await adminDb().from('website_scans').select('*').eq('id',id).single();
 const scan=data as ScanRow | null;
 const guestAllowed=scan && !scan.user_id && token && scan.guest_hash===digest(token) && Date.parse(scan.created_at)>Date.now()-86400000;
 if(error||!scan||!(user && scan.user_id===user.id) && !guestAllowed) throw new HttpError(404,'Scan not found.');
 return {scan,user};
}
export async function rateLimit(req: Request, scope: string, limit: number, userId?: string) {
 // Only trust a forwarding header when the deployment proxy overwrites it.
 const header=process.env.TRUSTED_IP_HEADER;
 const ip=header ? req.headers.get(header)?.split(',')[0]?.trim() : 'shared';
 const key=digest(`${scope}:${userId || ip || 'shared'}`);
 const {data,error}=await adminDb().rpc('consume_rate',{p_key:key,p_limit:limit,p_window:3600});
 if(error) throw error; if(!data) throw new HttpError(429,'Too many requests. Please try again in an hour.');
}
