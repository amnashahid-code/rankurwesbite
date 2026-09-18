import 'server-only';
import { adminDb } from '@/lib/supabase/server';
import { ownedScan } from '@/lib/security/http';
import type { ReportContent } from '@/types';
export async function accessibleReport(scanId:string){const {scan,user}=await ownedScan(scanId);const {data,error}=await adminDb().from('reports').select('id,user_id,unlocked,content').eq('scan_id',scan.id).maybeSingle();if(error)throw error;const unlocked=!!(data?.unlocked&&user&&data.user_id===user.id);return {scan,user,reportId:data?.id||null,unlocked,content:unlocked?data!.content as ReportContent:null};}
