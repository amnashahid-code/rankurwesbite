import { describe,it,expect,afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { validStripeSession } from '@/lib/payments/stripe';
import { validPayfastHash } from '@/lib/payments/payfast';
import type { PaymentRow } from '@/types';
const payment={id:'test-order',amount_cents:200,currency:'USD',provider_session_id:'cs_test_123'} as PaymentRow;
const session={id:'cs_test_123',payment_status:'paid',client_reference_id:'test-order',metadata:{payment_id:'test-order'},amount_total:200,currency:'usd'} as unknown as Stripe.Checkout.Session;
describe('payment verification',()=>{
 it('requires exact verified session, order, amount and currency',()=>{expect(validStripeSession(session,payment)).toBe(true);for(const change of [{payment_status:'unpaid'},{amount_total:150},{currency:'pkr'},{client_reference_id:'other'},{metadata:{payment_id:'other'}},{id:'other'}])expect(validStripeSession({...session,...change} as Stripe.Checkout.Session,payment)).toBe(false);});
 it('rejects forged Stripe webhook signatures',()=>{const stripe=new Stripe('sk_test_unit');const payload=JSON.stringify({id:'evt_1',type:'checkout.session.completed',data:{object:session}});const signature=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_unit'});expect(stripe.webhooks.constructEvent(payload,signature,'whsec_unit').id).toBe('evt_1');expect(()=>stripe.webhooks.constructEvent(payload.replace('200','150'),signature,'whsec_unit')).toThrow();expect(()=>stripe.webhooks.constructEvent(payload,'forged','whsec_unit')).toThrow();});
 it('validates PayFast callback digest and rejects changed basket',()=>{process.env.PAYFAST_SECURED_KEY='unit-key';process.env.PAYFAST_MERCHANT_ID='unit-merchant';const fields={basket_id:'order',err_code:'000',validation_hash:createHash('sha256').update('order|unit-key|unit-merchant|000').digest('hex')};expect(validPayfastHash(fields)).toBe(true);expect(validPayfastHash({...fields,basket_id:'other'})).toBe(false);expect(validPayfastHash({...fields,validation_hash:'wrong'})).toBe(false);});
 afterEach(()=>{delete process.env.PAYFAST_SECURED_KEY;delete process.env.PAYFAST_MERCHANT_ID;});
});
