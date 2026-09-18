import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Header,Footer } from '@/components/ui';
import { AuthForm,type AuthMode } from '@/components/auth-form';
export const metadata:Metadata={title:'Your account',robots:{index:false,follow:false},alternates:{canonical:null}};
export default async function AuthPage({params,searchParams}:{params:Promise<{mode:string}>;searchParams:Promise<{next?:string;error?:string}>}){const {mode}=await params;const search=await searchParams;if(!['sign-in','sign-up','forgot-password','reset-password'].includes(mode))notFound();return <><Header/><main id="main" className="auth-page"><div>{search.error&&<div className="error">The verification link expired or could not be used. Please request another link.</div>}<AuthForm mode={mode as AuthMode} next={search.next}/></div></main><Footer/></>;}
