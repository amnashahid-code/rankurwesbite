'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe2, CheckCircle2 } from 'lucide-react';

const friendlyError="We couldn't analyze this website right now. Please check the URL and try again.";
const checks=['Checking SEO','Checking performance','Checking mobile readiness','Checking technical issues','Generating your score'];

export function ScanProgress({id}:{id:string}){
 const router=useRouter();const [scan,setScan]=useState<{progress:number;stage:string;status:string}>({progress:0,stage:'Preparing your website scan',status:'queued'});const [error,setError]=useState('');
 useEffect(()=>{let active=true;async function poll(){try{const res=await fetch(`/api/scans/${id}`);const data=await res.json().catch(()=>null);if(!res.ok||!data)throw new Error();if(active){setScan(data);setError('');if(data.status==='completed')router.replace(`/report/${id}`);if(data.status==='failed')setError(friendlyError);}}catch{if(active)setError(friendlyError);}}void poll();const timer=setInterval(poll,2500);return()=>{active=false;clearInterval(timer);};},[id,router]);
 const complete=Math.min(checks.length,Math.floor(scan.progress/20));const failed=scan.status==='failed'||scan.status==='cancelled';
 return <div className="scan-progress"><div className="scanner"><Globe2 size={64}/></div><div className="eyebrow" style={{justifyContent:'center'}}>YOUR WEBSITE IS BEING CHECKED</div><h1>{failed?'We couldn’t finish this scan.':'Analyzing your website.'}</h1><p role="status">{failed?'Please try again with a public website URL.':scan.stage}</p><div className="progress-track" role="progressbar" aria-valuenow={scan.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Scan progress"><div style={{width:`${scan.progress}%`}}/></div><div className="scan-checks" aria-label="Website audit checks">{checks.map((check,index)=><span className={index<complete?'done':index===complete?'active':''} key={check}>{index<complete?<CheckCircle2 size={13}/>:<i/>}{check}</span>)}</div>{error&&<div className="error" role="alert">{error}</div>}{['queued','running'].includes(scan.status)?<button className="button small" onClick={async()=>{try{const res=await fetch(`/api/scans/${id}`,{method:'DELETE'});if(res.ok)setScan(s=>({...s,status:'cancelled',stage:'Cancelled'}));else setError(friendlyError);}catch{setError(friendlyError);}}}>Cancel scan</button>:<Link href="/dashboard/analyze" className="button primary">Try another website</Link>}<p style={{marginTop:26,fontSize:11}}>Your free preview will be ready in a moment.</p></div>;
}
