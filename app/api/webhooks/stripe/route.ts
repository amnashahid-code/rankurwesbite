import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripeClient,validStripeSession } from '@/lib/payments/stripe';
import { adminDb } from '@/lib/supabase/server';
import { api,HttpError } from '@/lib/security/http';
import type { PaymentRow } from '@/types';
export async function POST(req:Request){return api(async()=>{
 if(!process.env.STRIPE_WEBHOOK_SECRET)throw new HttpError(503,'Webhook is not configured.');
 const raw=await req.text();if(raw.length>262144)throw new HttpError(413,'Payload too large.');let event:Stripe.Event;
 try{event=stripeClient().webhooks.constructEvent(raw,req.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET);}catch{throw new HttpError(400,'Invalid webhook signature.');}
 if(process.env.APP_ENV==='production'&&!event.livemode)throw new HttpError(400,'Test events are not accepted in production.');
 const db=adminDb();
 if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){
  const session=await stripeClient().checkout.sessions.retrieve((event.data.object as Stripe.Checkout.Session).id);
  if(session.payment_status!=='paid')return NextResponse.json({received:true});
  const {data}=await db.from('payments').select('*').eq('id',session.metadata?.payment_id||'').eq('provider','stripe').single();
  if(!data||!validStripeSession(session,data as PaymentRow))throw new HttpError(400,'Payment details do not match.');
  const transaction=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;if(!transaction)throw new HttpError(400,'Missing payment transaction.');
  const {error}=await db.rpc('fulfill_payment',{p_payment:data.id,p_provider:'stripe',p_event:event.id,p_transaction:transaction,p_amount:session.amount_total,p_currency:session.currency!.toUpperCase()});if(error)throw error;
 }else if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
  const session=event.data.object as Stripe.Checkout.Session;const {error}=await db.from('payments').update({status:event.type==='checkout.session.expired'?'cancelled':'failed'}).eq('provider_session_id',session.id).in('status',['pending','processing']);if(error)throw error;
 }else if(event.type==='charge.refunded'){
  const charge=event.data.object as Stripe.Charge;if(charge.refunded){const {error}=await db.rpc('refund_payment',{p_transaction:typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id,p_event:event.id});if(error)throw error;}
 }
 return NextResponse.json({received:true});
});}
