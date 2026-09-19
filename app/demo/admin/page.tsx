import { Header } from '@/components/ui';
import { AdminDashboard } from '@/components/dashboard/admin';
import { demoAnalytics,demoSettings } from '@/lib/demo';
export default function DemoAdmin(){return <><Header/><main id="main" className="container" style={{paddingTop:40,paddingBottom:60}}><AdminDashboard initialData={demoAnalytics} initialSettings={demoSettings} demo/></main></>;}
