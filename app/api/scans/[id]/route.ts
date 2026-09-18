import { NextResponse } from 'next/server';
import { api, ownedScan, originCheck } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){return api(async()=>{const {scan}=await ownedScan((await params).id);return NextResponse.json({id:scan.id,url:scan.url,status:scan.status,progress:scan.progress,stage:scan.stage,preview:scan.preview,error:scan.error},{headers:{'Cache-Control':'private, no-store'}});});}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){return api(async()=>{originCheck(req);const {scan}=await ownedScan((await params).id);const {error}=await adminDb().from('website_scans').update({status:'cancelled',stage:'Cancelled'}).eq('id',scan.id).in('status',['queued','running']);if(error)throw error;return NextResponse.json({ok:true});});}
