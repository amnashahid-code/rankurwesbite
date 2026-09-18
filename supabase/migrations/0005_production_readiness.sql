-- Only genuine auth/application records are backfilled. No sample users or scans.
create or replace function public.sync_auth_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare ref_id uuid;
begin
 insert into profiles(id,first_name,email_verified)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'first_name',''),80),new.email_confirmed_at is not null)
 on conflict(id) do nothing;
 if TG_OP='INSERT' then
  select id into ref_id from profiles where referral_code=new.raw_user_meta_data->>'referral_code' and id<>new.id and email_verified;
  if ref_id is not null then
   insert into referrals(referrer_id,referred_id) values(ref_id,new.id) on conflict do nothing;
  end if;
 end if;
 update profiles set email_verified=(new.email_confirmed_at is not null) where id=new.id;
 if new.email_confirmed_at is not null then
  perform record_event('registered:'||new.id,'user_registered',new.id);
  perform verify_referral(new.id);
 end if;
 return new;
end $$;

-- Users created before the application tables were installed can still sign in.
insert into public.profiles(id,first_name,email_verified)
select id,left(coalesce(raw_user_meta_data->>'first_name',''),80),email_confirmed_at is not null
from auth.users on conflict(id) do nothing;
update public.profiles p set email_verified=(u.email_confirmed_at is not null)
from auth.users u where u.id=p.id;
insert into public.referrals(referrer_id,referred_id)
select p.id,u.id from auth.users u join public.profiles p
on p.referral_code=u.raw_user_meta_data->>'referral_code'
where p.id<>u.id and p.email_verified on conflict do nothing;

insert into public.platform_events(event_key,event_type,user_id,created_at)
select 'registered:'||id,'user_registered',id,email_confirmed_at from auth.users
where email_confirmed_at is not null on conflict(event_key) do nothing;
insert into public.platform_events(event_key,event_type,user_id,website_project_id,created_at)
select 'scan:'||id,'website_scan_completed',user_id,website_project_id,coalesce(completed_at,created_at)
from public.website_scans where status='completed' on conflict(event_key) do nothing;
insert into public.platform_events(event_key,event_type,user_id,created_at)
select 'report:'||scan_id,'report_generated',user_id,created_at from public.reports
on conflict(event_key) do nothing;
update public.platform_totals set
registered_users=(select count(*) from public.platform_events where event_type='user_registered'),
completed_scans=(select count(*) from public.platform_events where event_type='website_scan_completed'),
reports_generated=(select count(*) from public.platform_events where event_type='report_generated') where id;
do $$ declare u uuid; begin
 for u in select referred_id from public.referrals where status='pending' loop
  perform public.verify_referral(u);
 end loop;
end $$;

-- Owners may read referral progress, but never invitee IDs or fraud metadata.
drop policy if exists own_referral_progress on public.referrals;
create policy own_referral_progress on public.referrals for select to authenticated
using(referrer_id=(select auth.uid()));
revoke all on public.referrals from anon,authenticated;
grant select(id,referrer_id,status,converted,created_at,verified_at) on public.referrals to authenticated;

create index if not exists reports_owner_date on public.reports(user_id,created_at desc);
create index if not exists projects_owner_date on public.website_projects(user_id,created_at desc);
create index if not exists events_owner_date on public.platform_events(user_id,created_at desc);
create index if not exists ranking_checks_keyword_date on public.ranking_checks(keyword_id,checked_at desc);

-- Read-only diagnostics. Accessible only with the server credential.
create or replace function public.setup_status() returns jsonb
language sql security definer set search_path=public as $$
select jsonb_build_object('schemaVersion',5,'rlsEnabled',
 (select count(*)=15 and bool_and(relrowsecurity) from pg_class
 where relnamespace='public'::regnamespace and relname in
 ('profiles','website_projects','website_scans','audit_issues','reports','referrals','discounts','payments',
 'platform_events','platform_totals','app_settings','ranking_keywords','ranking_checks','rate_limits','webhook_receipts')),
 'authTriggersEnabled',(select count(*)=2 and bool_and(tgenabled<>'D') from pg_trigger
 where tgrelid='auth.users'::regclass and tgname in ('on_auth_user_created','on_auth_user_verified')),
 'settingsPresent',exists(select 1 from app_settings where id),
 'totalsPresent',exists(select 1 from platform_totals where id));
$$;
revoke all on function public.setup_status() from public,anon,authenticated;
grant execute on function public.setup_status() to service_role;
revoke all on function public.sync_auth_user() from public,anon,authenticated;
grant execute on function public.sync_auth_user() to service_role;
