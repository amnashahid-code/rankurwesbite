import { NextResponse } from 'next/server';
import { api } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data';
const labels:Record<string,string>={user_registered:'A new member joined the community',website_scan_completed:'A website analysis was completed',report_generated:'A website report was generated',rescan_completed:'A website was re-scanned'};
export async function GET(){return api(async()=>{const settings=await getSettings();if(!settings.activity_enabled)return NextResponse.json([]);const {data,error}=await adminDb().from('platform_events').select('event_type,created_at').in('event_type',Object.keys(labels)).order('created_at',{ascending:false}).limit(5);if(error)throw error;return NextResponse.json(data.map(row=>({message:labels[row.event_type],date:row.created_at.slice(0,10)})),{headers:{'Cache-Control':'public, s-maxage=60'}});});}
