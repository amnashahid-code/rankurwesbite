import { redirect } from 'next/navigation';
import { Header } from '@/components/ui';
import { Sidebar } from '@/components/dashboard/sidebar';
import { currentUser } from '@/lib/security/http';
export const metadata={title:'Your dashboard',robots:{index:false,follow:false},alternates:{canonical:null}};
export const dynamic='force-dynamic';
export default async function DashboardLayout({children}:{children:React.ReactNode}){if(!await currentUser())redirect('/auth/sign-in');return <><Header/><div className="dashboard"><Sidebar/><main id="main" className="workspace">{children}</main></div></>;}
