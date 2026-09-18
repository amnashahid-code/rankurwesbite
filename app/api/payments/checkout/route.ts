import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api,body,HttpError,originCheck,rateLimit,requireUser,uuid } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
import { stripeCheckout } from '@/lib/payments/stripe';
import type { PaymentRow } from '@/types';
export async function POST(req:Request){return api(async()=>{
 originCheck(req);const user=await requireUser();await rateLimit(req,'checkout',20,user.id);const input=z.object({reportId:uuid,provider:z.enum(['stripe','payfast'])}).parse(await body(req));
 const db=adminDb();const {data:report}=await db.from('reports').select('id,scan_id').eq('id',input.reportId).eq('user_id',user.id).single();if(!report)throw new HttpError(404,'Report not found.');
 const {data,error}=await db.rpc('reserve_payment',{p_user:user.id,p_report:report.id,p_provider:input.provider,p_pkr_rate:process.env.PAYFAST_USD_TO_PKR?Number(process.env.PAYFAST_USD_TO_PKR):null});if(error)throw new HttpError(409,error.message);const payment=data as PaymentRow;
 if(input.provider==='payfast')return NextResponse.json({url:`/checkout/payfast/${payment.id}`});
 if(payment.checkout_url)return NextResponse.json({url:payment.checkout_url});
 const checkout=await stripeCheckout(payment,user.email!,report.scan_id);
 const {error:saveError}=await db.from('payments').update({provider_session_id:checkout.id,checkout_url:checkout.url,status:'processing'}).eq('id',payment.id);if(saveError)throw saveError;
 return NextResponse.json({url:checkout.url});
});}
