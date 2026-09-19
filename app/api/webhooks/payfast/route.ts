import { NextResponse } from 'next/server';
import { api,HttpError } from '@/lib/security/http';
import { adminDb } from '@/lib/supabase/server';
import { validPayfastHash,verifyPayfast } from '@/lib/payments/payfast';
import type { PaymentRow } from '@/types';
export async function POST(req:Request){return api(async()=>{
 const raw=await req.text();if(raw.length>16000)throw new HttpError(413,'Payload too large.');const fields=Object.fromEntries(new URLSearchParams(raw));
 if(!validPayfastHash(fields))throw new HttpError(400,'Invalid PayFast validation hash.');
 const db=adminDb();const {data}=await db.from('payments').select('*').eq('id',fields.basket_id).eq('provider','payfast').single();if(!data)throw new HttpError(404,'Payment not found.');
 if(fields.err_code!=='000'&&fields.err_code!=='00'){await db.from('payments').update({status:'failed'}).eq('id',data.id).in('status',['pending','processing']);return NextResponse.json({received:true});}
 if(!fields.transaction_id||!await verifyPayfast(data as PaymentRow,fields.transaction_id))throw new HttpError(400,'Payment could not be verified.');
 const {error}=await db.rpc('fulfill_payment',{p_payment:data.id,p_provider:'payfast',p_event:fields.transaction_id,p_transaction:fields.transaction_id,p_amount:data.amount_cents,p_currency:data.currency});if(error)throw error;
 return NextResponse.json({received:true});
});}
