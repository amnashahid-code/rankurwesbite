import 'server-only';
import { createHash } from 'node:crypto';
import { equalSecret } from '@/lib/security/http';
import { brand } from '@/lib/config';
import type { PaymentRow } from '@/types';
// Pakistan PayFast hosted checkout (apps.net.pk), NOT South African PayFast.
// Merchant-specific transaction API access must be provisioned by PayFast.
function config(){
 const merchant=process.env.PAYFAST_MERCHANT_ID,key=process.env.PAYFAST_SECURED_KEY;
 const base=process.env.PAYFAST_CHECKOUT_BASE_URL;
 if(!merchant||!key||!base||!['https://ipguat.apps.net.pk','https://ipg1.apps.net.pk'].includes(base))throw new Error('PayFast merchant checkout is not configured.');
 if(process.env.APP_ENV==='production'&&base.includes('ipguat'))throw new Error('Production cannot use PayFast UAT.');
 if(process.env.PAYFAST_CONTRACT_VERIFIED!=='true')throw new Error('PayFast merchant integration must pass acceptance testing before activation.');
 return {merchant,key,base};
}
export async function payfastFields(payment:PaymentRow,email:string,scanId:string){
 const {merchant,key,base}=config();
 const res=await fetch(`${base}/Ecommerce/api/Transaction/GetAccessToken`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({MERCHANT_ID:merchant,SECURED_KEY:key,BASKET_ID:payment.id,TXNAMT:(payment.amount_cents/100).toFixed(2),CURRENCY_CODE:payment.currency}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('PayFast could not initialize checkout.');const data=await res.json();if(typeof data.ACCESS_TOKEN!=='string'||!data.ACCESS_TOKEN)throw new Error('PayFast token was not returned.');
 return {action:`${base}/Ecommerce/api/Transaction/PostTransaction`,fields:{MERCHANT_ID:merchant,TOKEN:data.ACCESS_TOKEN,BASKET_ID:payment.id,TXNAMT:(payment.amount_cents/100).toFixed(2),CURRENCY_CODE:payment.currency,ORDER_DATE:payment.created_at.slice(0,10),SUCCESS_URL:`${brand.domain}/report/${scanId}?checkout=processing`,FAILURE_URL:`${brand.domain}/report/${scanId}?checkout=failed`,CHECKOUT_URL:`${brand.domain}/api/webhooks/payfast`,CUSTOMER_EMAIL_ADDRESS:email,PROCCODE:'00',TXNDESC:`${brand.name} report`,VERSION:'MERCHANT-CART-0.1'}};
}
export function validPayfastHash(fields:Record<string,string>){
 if(!process.env.PAYFAST_SECURED_KEY||!process.env.PAYFAST_MERCHANT_ID)return false;
 const hash=createHash('sha256').update(`${fields.basket_id}|${process.env.PAYFAST_SECURED_KEY}|${process.env.PAYFAST_MERCHANT_ID}|${fields.err_code}`).digest('hex');
 return equalSecret(hash,(fields.validation_hash||'').toLowerCase());
}
export async function verifyPayfast(payment:PaymentRow,transaction:string){
 config();const base=process.env.PAYFAST_TRANSACTION_API_URL;const token=process.env.PAYFAST_TRANSACTION_API_TOKEN;
 if(!base||!token||!base.startsWith('https://'))throw new Error('PayFast server verification is not configured.');
 const res=await fetch(`${base.replace(/\/$/,'')}/transaction/${encodeURIComponent(transaction)}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!res.ok)throw new Error('PayFast verification failed.');const data=await res.json();
 // Fail closed if the merchant contract omits amount/currency or uses a different schema.
 const amount=Number(data.transaction_amount ?? data.txnamt);const currency=String(data.currency_code||'');
 return data.basket_id===payment.id && data.transaction_id===transaction && data.status_code==='00' && Math.round(amount*100)===payment.amount_cents && currency.toUpperCase()===payment.currency;
}
