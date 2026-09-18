-- Run in a fresh Supabase project. All mutating RPCs are service-role only.
create extension if not exists pgcrypto;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null default '' check (length(first_name) <= 80),
 referral_code text not null unique default encode(gen_random_bytes(9),'hex'),
 email_verified boolean not null default false,
 is_admin boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.website_projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 url text not null, name text not null, notes text not null default '', created_at timestamptz not null default now(),
 unique(user_id,url)
);
create table public.website_scans (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
 website_project_id uuid references public.website_projects(id) on delete set null,
 guest_hash text, url text not null,
 status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
 progress integer not null default 0 check (progress between 0 and 100), stage text not null default 'Waiting to start',
 preview jsonb, error text, attempts integer not null default 0,
 lease_until timestamptz, created_at timestamptz not null default now(), completed_at timestamptz,
 check (user_id is not null or guest_hash is not null)
);
create index scans_user_date on public.website_scans(user_id,created_at desc);
create index scans_queue on public.website_scans(status,created_at);
create table public.audit_issues (
 id uuid primary key default gen_random_uuid(), scan_id uuid not null references public.website_scans(id) on delete cascade,
 code text not null, category text not null, severity text not null,
 deduction integer not null check (deduction between 0 and 100), title text not null, evidence text not null, recommendation text not null,
 unique(scan_id,code)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), scan_id uuid not null unique references public.website_scans(id) on delete cascade,
 user_id uuid references public.profiles(id) on delete cascade,
 content jsonb not null, unlocked boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.referrals (
 id uuid primary key default gen_random_uuid(), referrer_id uuid not null references public.profiles(id) on delete cascade,
 referred_id uuid not null unique references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 fraud_indicators jsonb not null default '[]', converted boolean not null default false,
 created_at timestamptz not null default now(), verified_at timestamptz,
 check (referrer_id <> referred_id)
);
create index referrals_owner on public.referrals(referrer_id,status);
create table public.discounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
 amount_cents integer not null check(amount_cents between 0 and 50), qualified_at timestamptz not null default now()
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 report_id uuid not null references public.reports(id) on delete cascade,
 provider text not null check(provider in ('stripe','payfast')),
 status text not null default 'pending' check(status in ('pending','processing','paid','failed','cancelled','refunded')),
 amount_cents integer not null check(amount_cents > 0), currency text not null default 'USD',
 base_usd_cents integer not null, discount_cents integer not null default 0 check(discount_cents between 0 and 50),
 provider_session_id text unique, provider_transaction_id text unique, checkout_url text,
 created_at timestamptz not null default now(), paid_at timestamptz
);
create index payments_owner on public.payments(user_id,created_at desc);
create unique index one_active_payment on public.payments(report_id,provider) where status in ('pending','processing');
create table public.platform_events (
 id bigint generated always as identity primary key,
 event_key text not null unique, event_type text not null,
 user_id uuid references public.profiles(id) on delete set null,
 website_project_id uuid references public.website_projects(id) on delete set null,
 country_code text check(country_code ~ '^[A-Z]{2}$'), metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index events_type_date on public.platform_events(event_type,created_at);
create table public.platform_totals (
 id boolean primary key default true check(id), registered_users bigint not null default 0,
 completed_scans bigint not null default 0, reports_generated bigint not null default 0
);
insert into public.platform_totals(id) values(true);
create table public.app_settings (
 id boolean primary key default true check(id), base_price_cents integer not null default 200 check(base_price_cents between 100 and 100000),
 referral_discount_cents integer not null default 50 check(referral_discount_cents between 0 and 50),
 referral_threshold integer not null default 5 check(referral_threshold >= 5),
 stripe_enabled boolean not null default false, payfast_enabled boolean not null default false,
 activity_enabled boolean not null default true, ai_enabled boolean not null default true,
 updated_at timestamptz not null default now(), check(base_price_cents > referral_discount_cents)
);
insert into public.app_settings(id) values(true);
create table public.ranking_keywords (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 website_project_id uuid not null references public.website_projects(id) on delete cascade,
 keyword text not null check(length(keyword) between 1 and 120), country text not null check(country ~ '^[a-z]{2}$'),
 created_at timestamptz not null default now(), unique(user_id,website_project_id,keyword,country)
);
create table public.ranking_checks (
 id uuid primary key default gen_random_uuid(), keyword_id uuid not null references public.ranking_keywords(id) on delete cascade,
 position integer check(position > 0), search_depth integer not null default 100, checked_at timestamptz not null default now()
);
create table public.rate_limits (key text primary key, hits integer not null, reset_at timestamptz not null);
create table public.webhook_receipts (provider text not null, event_id text not null, created_at timestamptz not null default now(), primary key(provider,event_id));

-- Clients can read only their own safe rows, never mutate payment/access/role state.
alter table public.profiles enable row level security;
alter table public.website_projects enable row level security;
alter table public.website_scans enable row level security;
alter table public.audit_issues enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;
alter table public.referrals enable row level security;
alter table public.discounts enable row level security;
alter table public.platform_events enable row level security;
alter table public.platform_totals enable row level security;
alter table public.app_settings enable row level security;
alter table public.ranking_keywords enable row level security;
alter table public.ranking_checks enable row level security;
alter table public.rate_limits enable row level security;
alter table public.webhook_receipts enable row level security;
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.website_projects, public.website_scans, public.reports, public.audit_issues, public.payments, public.discounts, public.ranking_keywords, public.ranking_checks to authenticated;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_projects on public.website_projects for select to authenticated using (user_id = (select auth.uid()));
create policy own_scans on public.website_scans for select to authenticated using (user_id = (select auth.uid()));
create policy own_unlocked_reports on public.reports for select to authenticated using (user_id = (select auth.uid()) and unlocked);
create policy own_unlocked_issues on public.audit_issues for select to authenticated using (exists(select 1 from public.reports r where r.scan_id = audit_issues.scan_id and r.user_id = (select auth.uid()) and r.unlocked));
create policy own_payments on public.payments for select to authenticated using (user_id = (select auth.uid()));
create policy own_discounts on public.discounts for select to authenticated using (user_id = (select auth.uid()));
create policy own_keywords on public.ranking_keywords for select to authenticated using(user_id = (select auth.uid()));
create policy own_rankings on public.ranking_checks for select to authenticated using(exists(select 1 from public.ranking_keywords k where k.id = ranking_checks.keyword_id and k.user_id = (select auth.uid())));

create function public.record_event(p_key text, p_type text, p_user uuid default null, p_project uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
 insert into platform_events(event_key,event_type,user_id,website_project_id) values(p_key,p_type,p_user,p_project) on conflict do nothing;
 if found then
  update platform_totals set registered_users = registered_users + (p_type='user_registered')::int,
   completed_scans = completed_scans + (p_type='website_scan_completed')::int,
   reports_generated = reports_generated + (p_type='report_generated')::int where id;
 end if;
end $$;

create function public.sync_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
declare ref_id uuid;
begin
 if TG_OP = 'INSERT' then
  insert into profiles(id,first_name,email_verified) values(new.id,left(coalesce(new.raw_user_meta_data->>'first_name',''),80),new.email_confirmed_at is not null);
  select id into ref_id from profiles where referral_code = new.raw_user_meta_data->>'referral_code' and id <> new.id and email_verified;
  if ref_id is not null then insert into referrals(referrer_id,referred_id) values(ref_id,new.id) on conflict do nothing; end if;
 end if;
 if new.email_confirmed_at is not null then
  update profiles set email_verified=true where id=new.id;
  perform record_event('registered:'||new.id,'user_registered',new.id);
  perform verify_referral(new.id);
 end if;
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.sync_auth_user();
create trigger on_auth_user_verified after update of email_confirmed_at on auth.users for each row execute function public.sync_auth_user();

create function public.verify_referral(p_user uuid) returns void language plpgsql security definer set search_path=public as $$
declare r referrals; s app_settings;
begin
 if not exists(select 1 from profiles where id=p_user and email_verified) or not exists(select 1 from website_scans where user_id=p_user and status='completed') then return; end if;
 update referrals set status='verified',verified_at=now() where referred_id=p_user and status='pending' returning * into r;
 if found then
  perform record_event('referral:'||r.id,'referral_verified',r.referrer_id);
  select * into s from app_settings where id;
  if (select count(*) from referrals where referrer_id=r.referrer_id and status='verified') >= s.referral_threshold then
   insert into discounts(user_id,amount_cents) values(r.referrer_id,s.referral_discount_cents) on conflict(user_id) do nothing;
  end if;
 end if;
end $$;

create function public.claim_scan(p_scan uuid, p_guest text, p_user uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare s website_scans; project uuid;
begin
 select * into s from website_scans where id=p_scan for update;
 if s.user_id is not null then return s.user_id=p_user; end if;
 if s.guest_hash is distinct from p_guest or s.created_at < now()-interval '24 hours' then return false; end if;
 insert into website_projects(user_id,url,name) values(p_user,s.url,s.url) on conflict(user_id,url) do update set url=excluded.url returning id into project;
 update website_scans set user_id=p_user,website_project_id=project,guest_hash=null where id=p_scan;
 update reports set user_id=p_user where scan_id=p_scan;
 perform verify_referral(p_user);
 return true;
end $$;

create function public.take_scan(p_id uuid default null) returns setof public.website_scans language plpgsql security definer set search_path=public as $$
declare picked uuid;
begin
 update website_scans set status='failed',stage='Scan timed out',error='The scan timed out. Please start a new scan.'
  where status='running' and lease_until<now() and attempts>=3;
 select id into picked from website_scans where (p_id is null or id=p_id) and (status='queued' or (status='running' and lease_until<now() and attempts<3)) order by created_at for update skip locked limit 1;
 if picked is null then return; end if;
 return query update website_scans set status='running',attempts=attempts+1,lease_until=now()+interval '4 minutes',stage='Validating website',progress=5 where id=picked returning *;
end $$;

create function public.complete_scan(p_id uuid, p_attempt integer, p_preview jsonb, p_content jsonb, p_issues jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare s website_scans; issue jsonb;
begin
 select * into s from website_scans where id=p_id for update;
 if s.status <> 'running' or s.attempts <> p_attempt then return false; end if;
 insert into reports(scan_id,user_id,content) values(s.id,s.user_id,p_content) on conflict(scan_id) do nothing;
 for issue in select * from jsonb_array_elements(p_issues) loop
  insert into audit_issues(scan_id,code,category,severity,deduction,title,evidence,recommendation)
  values(s.id,issue->>'code',issue->>'category',issue->>'severity',(issue->>'deduction')::int,issue->>'title',issue->>'evidence',issue->>'recommendation') on conflict do nothing;
 end loop;
 update website_scans set status='completed',preview=p_preview,progress=100,stage='Report ready',completed_at=now(),lease_until=null where id=p_id;
 perform record_event('scan:'||s.id,'website_scan_completed',s.user_id,s.website_project_id);
 perform record_event('report:'||s.id,'report_generated',s.user_id,s.website_project_id);
 if s.website_project_id is not null and exists(select 1 from website_scans where website_project_id=s.website_project_id and id<>s.id and status='completed') then
  perform record_event('rescan:'||s.id,'rescan_completed',s.user_id,s.website_project_id);
 end if;
 if s.user_id is not null then perform verify_referral(s.user_id); end if;
 return true;
end $$;

-- Reservation locks serialize concurrent checkout requests for a report.
create function public.reserve_payment(p_user uuid,p_report uuid,p_provider text,p_pkr_rate numeric default null) returns public.payments language plpgsql security definer set search_path=public as $$
declare r reports; s app_settings; p payments; discount integer:=0; amount integer; curr text:='USD';
begin
 select * into r from reports where id=p_report and user_id=p_user for update;
 if not found or r.unlocked then raise exception 'Report unavailable'; end if;
 select * into s from app_settings where id;
 if not exists(select 1 from profiles where id=p_user and email_verified) then raise exception 'Verify your email first'; end if;
 if not ((p_provider='stripe' and s.stripe_enabled) or (p_provider='payfast' and s.payfast_enabled)) then raise exception 'Provider unavailable'; end if;
 update payments set status='cancelled' where report_id=p_report and provider=p_provider and status in ('pending','processing') and created_at<now()-interval '24 hours';
 select * into p from payments where report_id=p_report and provider=p_provider and status in ('pending','processing');
 if found then return p; end if;
 if (select count(*) from referrals where referrer_id=p_user and status='verified') >= s.referral_threshold then discount:=s.referral_discount_cents; end if;
 amount:=s.base_price_cents-discount;
 if p_provider='payfast' then
  if p_pkr_rate is null or p_pkr_rate <= 0 then raise exception 'PKR conversion rate not configured'; end if;
  amount:=round(amount*p_pkr_rate); curr:='PKR';
 end if;
 insert into payments(user_id,report_id,provider,amount_cents,currency,base_usd_cents,discount_cents)
 values(p_user,p_report,p_provider,amount,curr,s.base_price_cents,discount) returning * into p;
 return p;
end $$;

create function public.fulfill_payment(p_payment uuid,p_provider text,p_event text,p_transaction text,p_amount integer,p_currency text) returns boolean language plpgsql security definer set search_path=public as $$
declare p payments;
begin
 select * into p from payments where id=p_payment for update;
 if not found or p.provider<>p_provider or p.amount_cents<>p_amount or p.currency<>upper(p_currency) or p.status='refunded' then raise exception 'Payment mismatch'; end if;
 insert into webhook_receipts(provider,event_id) values(p_provider,p_event) on conflict do nothing;
 if not found then return false; end if;
 if p.status='paid' then return false; end if;
 update payments set status='paid',provider_transaction_id=p_transaction,paid_at=now() where id=p.id;
 update reports set unlocked=true where id=p.report_id and user_id=p.user_id;
 update referrals set converted=true where referred_id=p.user_id and status='verified';
 perform record_event('unlock:'||p.id,'report_unlocked',p.user_id);
 return true;
end $$;
create function public.refund_payment(p_transaction text,p_event text) returns void language plpgsql security definer set search_path=public as $$
declare p payments;
begin
 select * into p from payments where provider_transaction_id=p_transaction for update;
 if not found then return; end if;
 insert into webhook_receipts(provider,event_id) values(p.provider,p_event) on conflict do nothing;
 if not found then return; end if;
 update payments set status='refunded' where id=p.id;
 update reports set unlocked=exists(select 1 from payments where report_id=p.report_id and status='paid') where id=p.report_id;
end $$;

create function public.consume_rate(p_key text,p_limit integer,p_window integer) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into rate_limits(key,hits,reset_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set hits=case when rate_limits.reset_at<now() then 1 else rate_limits.hits+1 end,
 reset_at=case when rate_limits.reset_at<now() then now()+make_interval(secs=>p_window) else rate_limits.reset_at end returning hits into n;
 return n<=p_limit;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
