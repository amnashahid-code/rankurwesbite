import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { api,body,currentUser,digest,guestToken,HttpError,originCheck,rateLimit } from '@/lib/security/http';
import { normalizeUrl, resolvePublic } from '@/lib/security/url';
import { adminDb } from '@/lib/supabase/server';
import { runScan } from '@/lib/analyzer/worker';
export const maxDuration=180;
export async function POST(req:Request){return api(async()=>{
 originCheck(req);const input=z.object({url:z.string().min(3).max(2048)}).parse(await body(req));const user=await currentUser();await rateLimit(req,'scan-ip',20);if(user)await rateLimit(req,'scan-user',10,user.id);
 let url:URL;try{url=normalizeUrl(input.url);await resolvePublic(url);}catch(e){throw new HttpError(400,e instanceof Error?e.message:'Invalid website URL.');}
 const db=adminDb();let projectId=null;
 if(user){
  // A rescan must preserve the owner's saved website name and notes.
  const {error}=await db.from('website_projects').upsert({user_id:user.id,url:url.href,name:url.hostname},{onConflict:'user_id,url',ignoreDuplicates:true});
  if(error)throw error;
  const {data,error:lookupError}=await db.from('website_projects').select('id').eq('user_id',user.id).eq('url',url.href).single();
  if(lookupError)throw lookupError;projectId=data.id;
 }
 const token=user?null:await guestToken(true);
 const {data,error}=await db.from('website_scans').insert({url:url.href,user_id:user?.id||null,website_project_id:projectId,guest_hash:token?digest(token):null}).select('id').single();if(error)throw error;
 after(async()=>{await runScan(data.id);});return NextResponse.json({id:data.id},{status:202});
});}
