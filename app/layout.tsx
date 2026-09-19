import type { Metadata } from 'next';
import { brand } from '@/lib/config';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(brand.domain),title:{default:`${brand.name} — Know what holds your website back`,template:`%s | ${brand.name}`},description:'Get a real website and SEO audit, understandable scores, and a practical improvement plan. Start with a free scan.',alternates:{canonical:'/'},openGraph:{type:'website',siteName:brand.name,title:`${brand.name} — Clarity for your next climb`,description:'Analyze your website and discover your next best improvement.'},robots:{index:true,follow:true},icons:{icon:brand.logo}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;}
