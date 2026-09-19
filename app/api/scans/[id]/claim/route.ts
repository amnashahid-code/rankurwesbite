import { NextResponse } from 'next/server';
import { api,digest,guestToken,HttpError,originCheck,requireUser,uuid } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){return api(async()=>{originCheck(req);const user=await requireUser();const id=uuid.parse((await params).id);const token=await guestToken();const {data,error}=await adminDb().rpc('claim_scan',{p_scan:id,p_guest:token?digest(token):'',p_user:user.id});if(error)throw error;if(!data)throw new HttpError(404,'Scan not found or expired.');return NextResponse.json({ok:true});});}
