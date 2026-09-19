import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api,body,originCheck,requireUser,uuid } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
export async function PATCH(req:Request){return api(async()=>{originCheck(req);const user=await requireUser();const input=z.discriminatedUnion('action',[z.object({action:z.literal('profile'),firstName:z.string().trim().min(1).max(80)}),z.object({action:z.literal('project'),id:uuid,name:z.string().trim().min(1).max(120),notes:z.string().max(4000)})]).parse(await body(req));const db=adminDb();const result=input.action==='profile'?await db.from('profiles').update({first_name:input.firstName}).eq('id',user.id):await db.from('website_projects').update({name:input.name,notes:input.notes}).eq('id',input.id).eq('user_id',user.id);if(result.error)throw result.error;return NextResponse.json({ok:true});});}
