import { notFound } from 'next/navigation';
import { Header } from '@/components/ui';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardContent } from '@/components/dashboard/content';
import { demoData,demoSettings } from '@/lib/demo';
export default async function DemoDashboard({params}:{params:Promise<{section?:string[]}>}){const parts=(await params).section||[];if(parts.length>1)notFound();return <><Header/><div className="dashboard"><Sidebar demo/><main id="main" className="workspace"><DashboardContent d={demoData} settings={demoSettings} section={parts[0]||'overview'} email="alex@example.com" demo/></main></div></>;}
