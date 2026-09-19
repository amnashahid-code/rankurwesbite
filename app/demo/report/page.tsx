import Link from 'next/link';
import { Header,Footer } from '@/components/ui';
import { ReportView } from '@/components/report-view';
import { demoScan,demoReport,demoSettings } from '@/lib/demo';
export default async function DemoReport({searchParams}:{searchParams:Promise<{preview?:string}>}){const preview=(await searchParams).preview==='true';return <><Header/><main id="main" className="report-shell"><div className="flex-actions" style={{marginTop:15}}><Link className="button small" href="/demo/report">Full report view</Link><Link className="button small" href="/demo/report?preview=true">Locked preview view</Link></div><ReportView scan={demoScan} initialContent={preview?null:demoReport} reportId="demo-report" loggedIn canClaim={false} settings={demoSettings} referrals={3} demo/></main><Footer/></>;}
