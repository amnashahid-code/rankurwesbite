import { notFound,redirect } from 'next/navigation';
import { Header,Footer } from '@/components/ui';
import { ReportView } from '@/components/report-view';
import { accessibleReport } from '@/lib/report';
import { getSettings } from '@/lib/data';
import { adminDb } from '@/lib/supabase/server';
import { HttpError } from '@/lib/security/http';

export const dynamic='force-dynamic';
export default async function ReportPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;let report;try{report=await accessibleReport(id);}catch(e){if(e instanceof HttpError&&e.status===404)notFound();throw e;}
 if(report.scan.status!=='completed')redirect(`/scan/${id}`);
 const settings=await getSettings();const {count}=report.user?await adminDb().from('referrals').select('*',{count:'exact',head:true}).eq('referrer_id',report.user.id).eq('status','verified'):{count:0};
 const preview=report.scan.preview;const issueCount=preview?.issues.length||0;
 return <><Header/><main id="main" className="report-shell">{!report.content&&preview&&<section className="panel free-preview-summary"><div className="eyebrow">YOUR FREE WEBSITE PREVIEW</div><h2>Your website scored {preview.overall}/100.</h2><p>We found {issueCount===1?'one priority to review':`${issueCount} top priorities to review`}. Your free preview shows the score and the most important detected issues below. Unlock the complete report for every finding, clear fixes, and a 30-day action plan.</p></section>}<ReportView scan={{...report.scan,guest_hash:null}} initialContent={report.content} reportId={report.reportId} loggedIn={!!report.user} canClaim={!!report.user&&!report.scan.user_id} settings={settings} referrals={count||0}/></main><Footer/></>;
}
