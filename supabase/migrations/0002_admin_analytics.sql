create function public.admin_analytics(p_days integer default 30) returns jsonb language sql security definer set search_path=public as $$
with cutoff as (select case when p_days=0 then '-infinity'::timestamptz else date_trunc('day',now())-make_interval(days=>greatest(p_days-1,0)) end as d),
growth as (
 select date_trunc('day',created_at)::date as day,
 count(*) filter(where event_type='user_registered') as users,
 count(*) filter(where event_type='website_scan_completed') as scans,
 count(*) filter(where event_type='report_generated') as reports
 from platform_events,cutoff where created_at>=cutoff.d group by 1
), revenue as (
 select date_trunc('day',paid_at)::date as day,sum(base_usd_cents-discount_cents) as usd_cents
 from payments,cutoff where status='paid' and paid_at>=cutoff.d group by 1
)
select jsonb_build_object(
 'totals',(select to_jsonb(t)-'id' from platform_totals t where id),
 'newUsersToday',(select count(*) from platform_events where event_type='user_registered' and created_at>=date_trunc('day',now())),
 'newUsersWeek',(select count(*) from platform_events where event_type='user_registered' and created_at>=date_trunc('week',now())),
 'newUsersMonth',(select count(*) from platform_events where event_type='user_registered' and created_at>=date_trunc('month',now())),
 'scans',(select jsonb_build_object('total',count(*),'successful',count(*) filter(where status='completed'),'failed',count(*) filter(where status='failed')) from website_scans,cutoff where created_at>=cutoff.d),
 'payments',(select jsonb_build_object('total',count(*),'paid',count(*) filter(where status='paid'),'failed',count(*) filter(where status='failed'),'discountsUsed',count(*) filter(where status='paid' and discount_cents>0),'revenueUsdCents',coalesce(sum(base_usd_cents-discount_cents) filter(where status='paid'),0)) from payments,cutoff where created_at>=cutoff.d),
 'reports',(select jsonb_build_object('total',count(*),'paid',count(*) filter(where unlocked),'free',count(*) filter(where not unlocked)) from reports,cutoff where created_at>=cutoff.d),
 'referralConversions',(select count(*) from referrals,cutoff where converted and verified_at>=cutoff.d),
 'growth',coalesce((select jsonb_agg(jsonb_build_object('day',coalesce(g.day,r.day),'users',coalesce(g.users,0),'scans',coalesce(g.scans,0),'reports',coalesce(g.reports,0),'revenueUsdCents',coalesce(r.usd_cents,0)) order by coalesce(g.day,r.day)) from growth g full join revenue r using(day)),'[]'::jsonb)
);
$$;
revoke all on function public.admin_analytics(integer) from public,anon,authenticated;
grant execute on function public.admin_analytics(integer) to service_role;
