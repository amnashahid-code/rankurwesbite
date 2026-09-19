create function public.public_growth() returns jsonb language sql security definer set search_path=public as $$
 with days as (select generate_series(date_trunc('day',now())-interval '13 days',date_trunc('day',now()),interval '1 day') as bucket),
 counts as (select date_trunc('day',created_at) as bucket,count(*) as n from platform_events where event_type='website_scan_completed' and created_at>=date_trunc('day',now())-interval '13 days' group by 1)
 select jsonb_agg(jsonb_build_object('date',days.bucket::date,'scans',coalesce(counts.n,0)) order by days.bucket) from days left join counts using(bucket);
$$;
create function public.maintain_platform() returns void language plpgsql security definer set search_path=public as $$
begin
 delete from rate_limits where reset_at<now()-interval '1 day';
 -- Unsaved anonymous reports are never permanently retained.
 delete from website_scans where user_id is null and created_at<now()-interval '7 days';
end $$;
revoke all on function public.public_growth() from public,anon,authenticated;
revoke all on function public.maintain_platform() from public,anon,authenticated;
grant execute on function public.public_growth() to service_role;
grant execute on function public.maintain_platform() to service_role;
