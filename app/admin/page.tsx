import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/ui';
import { AdminDashboard } from '@/components/dashboard/admin';
import { requireAdmin } from '@/lib/security/http';
export const metadata={title:'Admin analytics',robots:{index:false,follow:false},alternates:{canonical:null}};
export const dynamic='force-dynamic';
export default async function Admin(){try{await requireAdmin();}catch{redirect('/dashboard');}return <><Header/><main id="main" className="container" style={{paddingTop:35,paddingBottom:60}}><Link href="/dashboard" className="inline-link" style={{fontSize:12}}>← Your dashboard</Link><div style={{marginTop:25}}><AdminDashboard/></div></main></>;}
