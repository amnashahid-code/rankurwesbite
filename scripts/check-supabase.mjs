// Local, read-only diagnostic. Never prints API keys, sessions, or private rows.
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd(), true, {info(){},error(){}});
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'];
const missing=required.filter(key=>!process.env[key]);
if(missing.length){
 console.error(`Fill these fields in .env.local: ${missing.join(', ')}. Never paste keys into chat.`);
 process.exit(1);
}
try {
 const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Use the HTTPS Project URL from Supabase.');
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(key.startsWith('sb_secret_'))throw new Error('A secret key was placed in the PUBLIC key field. Replace it with a publishable key.');
 if(key.split('.').length===3){
  const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());
  if(payload.role!=='anon')throw new Error('The public key must be publishable or legacy anon, never service_role.');
 }
 const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}};
 const db=createClient(url.href,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
 const auth=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 if(!auth.ok)throw new Error(`Public key / Auth check failed (HTTP ${auth.status}). Check the URL and key belong to the same project.`);
 const settings=await auth.json();
 console.log('PASS: Project URL and public key reach Supabase Auth.');
 if(!settings.external?.email||settings.disable_signup||settings.mailer_autoconfirm){
  throw new Error('In Authentication, enable Email signup and Confirm email. Then run this check again.');
 }
 console.log('PASS: Email signup and confirmation are enabled.');
 const {data,error}=await db.rpc('setup_status');
 if(error)throw new Error(`Database setup check failed (${error.code||'request failed'}). Verify the server key and run supabase/final-production-setup.sql.`);
 if(data.schemaVersion!==5||!data.rlsEnabled||!data.authTriggersEnabled||!data.settingsPresent||!data.totalsPresent)
  throw new Error('Database setup is incomplete: run supabase/final-production-setup.sql and retry.');
 // Selecting columns with limit(0) validates the API schema without reading user data.
 const columns={
  profiles:'id,first_name,referral_code,email_verified,is_admin,created_at',
  website_projects:'id,user_id,url,name,notes,created_at',
  website_scans:'id,user_id,website_project_id,guest_hash,url,status,progress,stage,preview,error,attempts,lease_until,created_at,completed_at',
  reports:'id,scan_id,user_id,content,unlocked,created_at',
  referrals:'id,referrer_id,referred_id,status,fraud_indicators,converted,created_at,verified_at',
  discounts:'id,user_id,amount_cents,qualified_at',
  payments:'id,user_id,report_id,provider,status,amount_cents,currency,base_usd_cents,discount_cents,provider_session_id,provider_transaction_id,checkout_url,created_at,paid_at',
  audit_issues:'id,scan_id,code,category,severity,deduction,title,evidence,recommendation',
  platform_events:'id,event_key,event_type,user_id,website_project_id,country_code,metadata,created_at',
  platform_totals:'id,registered_users,completed_scans,reports_generated',
  app_settings:'id,base_price_cents,referral_discount_cents,referral_threshold,stripe_enabled,payfast_enabled,activity_enabled,ai_enabled,updated_at',
  ranking_keywords:'id,user_id,website_project_id,keyword,country,created_at',
  ranking_checks:'id,keyword_id,position,search_depth,checked_at',
  rate_limits:'key,hits,reset_at',webhook_receipts:'provider,event_id,created_at',
 };
 for(const [table,select] of Object.entries(columns)){
  const {error}=await db.from(table).select(select).limit(0);
  if(error)throw new Error(`Schema check failed for ${table} (${error.code||'request failed'}). Run the complete SQL setup.`);
 }
 console.log('PASS: Server credential, all 15 tables and required columns, RLS flags, auth triggers, and settings.');
 console.log('Next: follow SUPABASE-SETUP.md to verify email delivery, two-account isolation, and real scans in your browser.');
} catch(error) {
 // Only our own messages are safe to print; fetch/SDK exceptions can contain request details.
 const message=error instanceof Error?error.message:'';
 const safe=/^(Use the HTTPS|A secret key|The public key|Public key \/ Auth|In Authentication|Database setup|Schema check)/.test(message);
 console.error(safe?message:'Connection check failed. Check your local values and internet connection; no secrets were printed.');
 process.exitCode=1;
}
