import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';

export function publicIp(ip: string) {
 try { const parsed=ipaddr.process(ip); return parsed.range()==='unicast'; } catch { return false; }
}
export function normalizeUrl(input: string) {
 const value=input.trim(); if(value.length>2048) throw new Error('URL is too long.');
 const url=new URL(/^[a-z][a-z\d+.-]*:/i.test(value)?value:`https://${value}`);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password) throw new Error('Use a public HTTP or HTTPS URL without credentials.');
 if(url.port && !['80','443'].includes(url.port)) throw new Error('Only standard web ports are supported.');
 const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
 if(!host.includes('.') && !host.includes(':') || /(^|\.)(localhost|local|internal|test|invalid|home|lan)$/.test(host) || host==='metadata.google.internal') throw new Error('Private and local addresses cannot be scanned.');
 if(ipaddr.isValid(host) && !publicIp(host)) throw new Error('Private and reserved addresses cannot be scanned.');
 url.hash='';return url;
}
export async function resolvePublic(url: URL) {
 const host=url.hostname.replace(/^\[|\]$/g,'');
 const records=ipaddr.isValid(host)?[{address:host,family:ipaddr.parse(host).kind()==='ipv4'?4:6}]:await lookup(host,{all:true});
 if(!records.length || records.some(r=>!publicIp(r.address))) throw new Error('This hostname resolves to a private or reserved network.');
 return records[0];
}
export type SafeResponse={url:string;status:number;headers:http.IncomingHttpHeaders;body:string;bytes:number;durationMs:number;redirects:number};
export async function safeFetch(input: string, options: {method?:'GET'|'HEAD';maxBytes?:number;timeoutMs?:number;redirects?:number}={}): Promise<SafeResponse> {
 let url=normalizeUrl(input); const max=options.maxBytes??2_000_000; const started=Date.now();
 const deadline=started+(options.timeoutMs??12000);
 for(let redirects=0;redirects<=(options.redirects??4);redirects++) {
  const remaining=deadline-Date.now(); if(remaining<=0) throw new Error('The website took too long to respond.');
  const resolved=await Promise.race([resolvePublic(url),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('DNS lookup timed out.')),remaining);timer.unref();})]);
  const result=await new Promise<Omit<SafeResponse,'redirects'>>((resolve,reject)=>{
   const transport=url.protocol==='https:'?https:http;
   const req=transport.request(url,{method:options.method??'GET',agent:false,family:resolved.family,
    // Pin the validated address at connection time: prevents DNS rebinding.
    lookup:(_hostname,_options,callback)=>callback(null,resolved.address,resolved.family),
    headers:{'User-Agent':'RankYourWebsiteAudit/1.0','Accept':'text/html,application/xhtml+xml,text/plain,application/xml;q=0.9','Accept-Encoding':'identity'},
   },res=>{
    const chunks:Buffer[]=[];let bytes=0;
    if(Number(res.headers['content-length']||0)>max){res.destroy();req.destroy(new Error('The website response exceeds the size limit.'));return;}
    res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>max){req.destroy(new Error('The website response exceeds the size limit.'));res.destroy();}else chunks.push(chunk);});
    res.on('error',reject);
    res.on('end',()=>resolve({url:url.href,status:res.statusCode||0,headers:res.headers,body:Buffer.concat(chunks).toString('utf8'),bytes,durationMs:Date.now()-started}));
   });
   const timer=setTimeout(()=>req.destroy(new Error('The website took too long to respond.')),Math.max(1,deadline-Date.now()));
   req.on('error',reject);req.on('close',()=>clearTimeout(timer));req.end();
  });
  if([301,302,303,307,308].includes(result.status)&&result.headers.location){url=normalizeUrl(new URL(result.headers.location,url).href);continue;}
  if(result.headers['content-encoding'] && result.headers['content-encoding']!=='identity') throw new Error('The server returned unsupported compressed content.');
  return {...result,redirects};
 }
 throw new Error('The website redirected too many times.');
}
