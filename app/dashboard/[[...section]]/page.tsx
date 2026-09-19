import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/security/http';
import { dashboardData } from '@/lib/dashboard';
import { getSettings } from '@/lib/data';
import { DashboardContent } from '@/components/dashboard/content';
export default async function DashboardPage({params,searchParams}:{params:Promise<{section?:string[]}>;searchParams:Promise<{url?:string}>}){const parts=(await params).section||[];if(parts.length>1)notFound();const user=await currentUser();if(!user)redirect('/auth/sign-in');const [data,settings]=await Promise.all([dashboardData(user.id),getSettings()]);return <DashboardContent d={data} settings={settings} section={parts[0]||'overview'} email={user.email!} initialUrl={(await searchParams).url}/>;}
