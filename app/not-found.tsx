import Link from 'next/link';
import { Header,Footer } from '@/components/ui';
export default function NotFound(){return <><Header/><main id="main" className="auth-page"><div className="auth-card"><div className="eyebrow">404</div><h1>Page not found.</h1><p>This page may have moved, or you may not have access.</p><Link href="/" className="button primary">Back to home</Link></div></main><Footer/></>;}
