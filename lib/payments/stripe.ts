import 'server-only';
import Stripe from 'stripe';
import { brand } from '@/lib/config';
import type { PaymentRow } from '@/types';
export function stripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error('Stripe is not configured.');if(process.env.APP_ENV==='production'&&!key.startsWith('sk_live_'))throw new Error('Production requires a live Stripe key.');return new Stripe(key);}
export async function stripeCheckout(payment:PaymentRow,email:string,scanId:string){
 const session=await stripeClient().checkout.sessions.create({mode:'payment',client_reference_id:payment.id,customer_email:email,metadata:{payment_id:payment.id},payment_intent_data:{metadata:{payment_id:payment.id}},line_items:[{price_data:{currency:payment.currency.toLowerCase(),unit_amount:payment.amount_cents,product_data:{name:`${brand.name} — full website report`}},quantity:1}],success_url:`${brand.domain}/report/${scanId}?checkout=processing`,cancel_url:`${brand.domain}/report/${scanId}?checkout=cancelled`},{idempotencyKey:payment.id});
 if(!session.url)throw new Error('Checkout URL was not returned.');return {id:session.id,url:session.url};
}
export function validStripeSession(session:Stripe.Checkout.Session,payment:PaymentRow){return session.payment_status==='paid' && session.client_reference_id===payment.id && session.metadata?.payment_id===payment.id && session.amount_total===payment.amount_cents && session.currency?.toUpperCase()===payment.currency && (!payment.provider_session_id||payment.provider_session_id===session.id);}
