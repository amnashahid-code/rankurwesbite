create function public.personal_metrics(p_user uuid) returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object(
 'websites',(select count(*) from website_projects where user_id=p_user),
 'scans',(select count(*) from website_scans where user_id=p_user and status='completed'),
 'reports',(select count(*) from reports where user_id=p_user and unlocked),
 'average',(select round(avg((preview->>'overall')::numeric)) from website_scans where user_id=p_user and status='completed'),
 'referrals',(select count(*) from referrals where referrer_id=p_user and status='verified'),
 'payments',(select count(*) from payments where user_id=p_user and status='paid')
 );
$$;
revoke all on function public.personal_metrics(uuid) from public,anon,authenticated;
grant execute on function public.personal_metrics(uuid) to service_role;
