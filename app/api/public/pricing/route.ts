import { NextResponse } from 'next/server';
import { api } from '@/lib/security/http';
import { getSettings } from '@/lib/data';
export async function GET(){return api(async()=>{const s=await getSettings();return NextResponse.json({base_price_cents:s.base_price_cents,referral_discount_cents:s.referral_discount_cents,referral_threshold:s.referral_threshold},{headers:{'Cache-Control':'public, s-maxage=60'}});});}
