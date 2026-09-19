import { requireDemo } from '@/lib/demo';
import { DemoBoundary } from '@/components/demo-boundary';
export const dynamic='force-dynamic';
export const metadata={title:'Local interface demo',robots:{index:false,follow:false},alternates:{canonical:null}};
export default function DemoLayout({children}:{children:React.ReactNode}){requireDemo();return <DemoBoundary>{children}</DemoBoundary>;}
