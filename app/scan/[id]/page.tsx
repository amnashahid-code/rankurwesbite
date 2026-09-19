import { Header,Footer } from '@/components/ui';
import { ScanProgress } from '@/components/scan-progress';
export const metadata={title:'Analyzing your website',robots:{index:false,follow:false},alternates:{canonical:null}};
export default async function ScanPage({params}:{params:Promise<{id:string}>}){return <><Header/><main id="main" className="container"><ScanProgress id={(await params).id}/></main><Footer/></>;}
