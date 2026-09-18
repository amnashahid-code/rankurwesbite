import 'server-only';
import { adminDb } from '@/lib/supabase/server';
export async function dashboardData(userId:string){const db=adminDb();const results=await Promise.all([
 db.from('profiles').select('first_name,referral_code,email_verified,is_admin').eq('id',userId).single(),
 db.from('website_projects').select('id,name,url,notes,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(200),
 db.from('website_scans').select('id,url,status,preview,created_at,website_project_id').eq('user_id',userId).order('created_at',{ascending:false}).limit(200),
 db.from('reports').select('id,scan_id,unlocked,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(200),
 db.from('payments').select('id,status,provider,amount_cents,currency,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(200),
 db.from('referrals').select('status,converted,created_at,verified_at').eq('referrer_id',userId).order('created_at',{ascending:false}).limit(200),
 db.from('ranking_keywords').select('id,keyword,country,website_project_id,ranking_checks(position,search_depth,checked_at)').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
 db.from('platform_events').select('event_type,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(15),
 db.rpc('personal_metrics',{p_user:userId}),
 ]);for(const r of results)if(r.error)throw r.error;return {profile:results[0].data!,projects:results[1].data||[],scans:results[2].data||[],reports:results[3].data||[],payments:results[4].data||[],referrals:results[5].data||[],keywords:results[6].data||[],events:results[7].data||[],metrics:results[8].data};}
