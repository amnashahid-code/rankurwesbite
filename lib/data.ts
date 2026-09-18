import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/supabase/server';
import type { PublicStats, Settings } from '@/types';
export const getStats=unstable_cache(async():Promise<PublicStats>=>{const {data,error}=await adminDb().from('platform_totals').select('registered_users,completed_scans,reports_generated').eq('id',true).single();if(error)throw error;return {registeredUsers:Number(data.registered_users),completedScans:Number(data.completed_scans),reportsGenerated:Number(data.reports_generated)};},['public-stats'],{revalidate:30});
export async function getSettings():Promise<Settings>{const {data,error}=await adminDb().from('app_settings').select('base_price_cents,referral_discount_cents,referral_threshold,stripe_enabled,payfast_enabled,activity_enabled,ai_enabled').eq('id',true).single();if(error)throw error;return data;}
