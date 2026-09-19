'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Gift } from 'lucide-react';
import Link from 'next/link';
import { defaultPricing, money } from '@/lib/config';
import { CheckList } from '@/components/ui';

export function Pricing(){
 const [pricing,setPricing]=useState(defaultPricing);
 useEffect(()=>{fetch('/api/public/pricing').then(r=>r.ok?r.json():null).then(d=>{if(d)setPricing(d);}).catch(()=>{});},[]);
 const discounted=pricing.base_price_cents-pricing.referral_discount_cents;
 return <div className="pricing-card"><div className="pricing-top"><h3 className="mb-0">The full picture.</h3><span className="pill">One-time payment</span></div><div className="price">{money(pricing.base_price_cents)} <span>/ report</span></div><p style={{fontSize:12}}>Pay {money(pricing.base_price_cents)} and unlock your full report right away. No referrals and no subscription are required.</p><CheckList items={['Complete audit across all six categories','Every detected issue, with clear next steps','Prioritized fixes and a 30-day action plan','Downloadable report you can keep','Saved in your private dashboard']}/><Link href="#analyze" className="button primary">Start with a free scan <ArrowRight size={14}/></Link><div className="referral-box"><strong><Gift size={14} style={{display:'inline',marginRight:8}}/>Optional referral discount: save {money(pricing.referral_discount_cents)}.</strong><p>You can always buy the report for <b>{money(pricing.base_price_cents)}</b>. Refer {pricing.referral_threshold} verified users to pay <b>{money(discounted)}</b> instead. A referral qualifies only after email verification and a successful scan.</p></div></div>;
}
