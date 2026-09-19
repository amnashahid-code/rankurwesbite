import 'server-only';
import { adminDb } from '@/lib/supabase/server';
import { analyzeWebsite } from '@/lib/analyzer';
import { createReport } from '@/lib/ai/report';
import type { ScanRow } from '@/types';
export async function runScan(id?:string) {
 const db=adminDb();const {data,error}=await db.rpc('take_scan',{p_id:id||null});if(error)throw error;
 const scan=data?.[0] as ScanRow|undefined;if(!scan)return false;
 try {
  const audit=await analyzeWebsite(scan.url,async(progress,stage)=>{const {error}=await db.from('website_scans').update({progress,stage}).eq('id',scan.id).eq('status','running').eq('attempts',scan.attempts);if(error)throw error;});
  const {data:settings}=await db.from('app_settings').select('ai_enabled').eq('id',true).single();
  const content=await createReport(audit,settings?.ai_enabled??false);
  const preview={overall:audit.overall,scores:audit.scores,performanceSource:audit.performanceSource,issues:audit.issues.filter(i=>i.deduction>0).sort((a,b)=>b.deduction-a.deduction).slice(0,3)};
  const {error:saveError}=await db.rpc('complete_scan',{p_id:scan.id,p_attempt:scan.attempts,p_preview:preview,p_content:content,p_issues:audit.issues});if(saveError)throw saveError;
 }catch{await db.from('website_scans').update({status:'failed',stage:'We couldn’t analyze this website right now.',error:'We couldn’t analyze this website right now. Please check the URL and try again.'}).eq('id',scan.id).eq('status','running').eq('attempts',scan.attempts);}
 return true;
}
