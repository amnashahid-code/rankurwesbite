'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe2, LoaderCircle } from 'lucide-react';

const scanError="We couldn't analyze this website right now. Please check the URL and try again.";

export function ScanForm({initialUrl=''}:{initialUrl?:string}){
 const [url,setUrl]=useState(initialUrl),[error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 return <div><form className="scan-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const res=await fetch('/api/scans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const data=await res.json().catch(()=>null);if(!res.ok||!data?.id)throw new Error();router.push(`/scan/${data.id}`);}catch{setError(scanError);setBusy(false);}}}><Globe2 size={17}/><label className="sr-only" htmlFor={`url-${initialUrl}`}>Website URL</label><input id={`url-${initialUrl}`} aria-label="Website URL" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Enter your website URL" required maxLength={2048} autoComplete="url" inputMode="url"/><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={14}/>:null}{busy?'Starting scan…':'Analyze My Website'}{!busy&&<ArrowRight size={14}/>}</button></form>{error&&<div role="alert" className="error">{error}</div>}</div>;
}
