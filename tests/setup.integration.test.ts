import { beforeAll,afterAll,expect,it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const setup=readFileSync('supabase/final-production-setup.sql','utf8');
const owner=randomUUID(),other=randomUUID();
let db:PGlite;
async function rows(sql:string,args:unknown[]=[]){return (await db.query(sql,args)).rows;}
beforeAll(async()=>{
 db=new PGlite({extensions:{pgcrypto}});
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema extensions;create extension pgcrypto schema extensions;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon,service_role;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 create table public.unrelated(id integer);grant select on public.unrelated to anon;
 create function public.unrelated_rpc() returns integer language sql as $$select 1$$;
 grant execute on function public.unrelated_rpc() to anon;`);
 await db.query(`insert into auth.users values($1,now(),' {"first_name":"Existing owner","is_admin":true}'::jsonb),($2,null,'{}')`,[owner,other]);
 await db.exec(setup);
});
afterAll(async()=>{await db?.close();});

it('installs on a fresh project with pgcrypto in extensions and backfills real auth users',async()=>{
 expect(await rows('select first_name,email_verified,is_admin from profiles where id=$1',[owner]))
  .toEqual([{first_name:'Existing owner',email_verified:true,is_admin:false}]);
 expect(await rows('select registered_users,completed_scans,reports_generated from platform_totals'))
  .toEqual([{registered_users:1,completed_scans:0,reports_generated:0}]);
 expect(await rows('select setup_status() as status')).toEqual([{status:{schemaVersion:5,rlsEnabled:true,authTriggersEnabled:true,settingsPresent:true,totalsPresent:true}}]);
 await db.exec('set role anon');
 try {expect(await rows('select unrelated_rpc() as value')).toEqual([{value:1}]);expect(await rows('select * from unrelated')).toEqual([]);}
 finally {await db.exec('reset role');}
});

it('can be rerun without resetting saved websites, reports, referral codes, or settings',async()=>{
 await db.query("insert into website_projects(user_id,url,name,notes) values($1,'https://example.com/','My shop','Private notes')",[owner]);
 await db.query("insert into website_scans(user_id,url,status,completed_at) values($1,'https://example.com/','completed',now())",[owner]);
 await db.query("insert into reports(scan_id,user_id,content) select id,$1,'{\"saved\":true}' from website_scans",[owner]);
 await db.exec('update app_settings set base_price_cents=250');
 const codes=await rows('select id,referral_code from profiles order by id');
 await db.exec(setup);const totals=await rows('select * from platform_totals');await db.exec(setup);
 expect(await rows('select id,referral_code from profiles order by id')).toEqual(codes);
 expect(await rows('select name,notes from website_projects')).toEqual([{name:'My shop',notes:'Private notes'}]);
 expect(await rows('select content from reports')).toEqual([{content:{saved:true}}]);
 expect(await rows('select base_price_cents,stripe_enabled,payfast_enabled from app_settings')).toEqual([{base_price_cents:250,stripe_enabled:false,payfast_enabled:false}]);
 expect(await rows('select * from platform_totals')).toEqual(totals);
});

it('repairs missing columns, functions, indexes, policies and disabled triggers/RLS',async()=>{
 await db.exec(`alter table website_projects drop column notes;
 drop index reports_owner_date;drop function personal_metrics(uuid);
 drop policy own_projects on website_projects;alter table website_projects disable row level security;
 alter table auth.users disable trigger on_auth_user_verified;`);
 await db.exec(setup);
 expect(await rows('select notes from website_projects')).toEqual([{notes:''}]);
 expect(await rows("select relrowsecurity from pg_class where oid='website_projects'::regclass")).toEqual([{relrowsecurity:true}]);
 expect(await rows("select count(*)::int n from pg_policies where tablename='website_projects' and policyname='own_projects'")).toEqual([{n:1}]);
 expect(await rows("select to_regclass('reports_owner_date') is not null as ok")).toEqual([{ok:true}]);
 expect((await rows('select personal_metrics($1) as metrics',[owner]))[0]).toBeTruthy();
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[other]);
 expect(await rows('select email_verified from profiles where id=$1',[other])).toEqual([{email_verified:true}]);
});

it('isolates personal rows and referral progress and rejects privilege escalation',async()=>{
 await db.query('insert into referrals(referrer_id,referred_id) values($1,$2)',[owner,other]);
 await db.exec('set role authenticated');
 try {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  expect(await rows('select id from profiles')).toEqual([{id:other}]);
  for(const table of ['website_projects','website_scans','reports','payments'])expect(await rows(`select * from ${table}`)).toEqual([]);
  expect(await rows('select status from referrals')).toEqual([]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  expect(await rows('select status from referrals')).toEqual([{status:'pending'}]);
  await expect(rows('select referred_id from referrals')).rejects.toThrow();
  await expect(rows('select fraud_indicators from referrals')).rejects.toThrow();
  expect(await rows('select * from reports')).toEqual([]); // Paid content remains locked.
  for(const table of ['app_settings','platform_events','platform_totals'])await expect(rows(`select * from ${table}`)).rejects.toThrow();
  await expect(rows('select setup_status()')).rejects.toThrow();
  await expect(rows('select admin_analytics(30)')).rejects.toThrow();
  await expect(rows('update profiles set is_admin=true')).rejects.toThrow();
  await expect(rows("update referrals set status='verified'")).rejects.toThrow();
 } finally {await db.exec('reset role');}
});
