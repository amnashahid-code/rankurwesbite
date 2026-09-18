import { NextResponse } from 'next/server';
import { api } from '@/lib/security/http';
import { accessibleReport } from '@/lib/report';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){return api(async()=>{const r=await accessibleReport((await params).id);return NextResponse.json({reportId:r.reportId,unlocked:r.unlocked,content:r.content,canClaim:!!r.user&&!r.scan.user_id},{headers:{'Cache-Control':'private, no-store'}});});}
