import { describe,it,expect } from 'vitest';
import { normalizeUrl, publicIp } from '@/lib/security/url';
import { scoreIssues } from '@/lib/scoring';
import { analyzeHtml } from '@/lib/analyzer';
import { ruleReport } from '@/lib/ai/report';
import type { SafeResponse } from '@/lib/security/url';
describe('SSRF defenses',()=>{
 it.each(['http://localhost','http://127.0.0.1','http://127.1','http://2130706433','http://0x7f000001','http://10.0.0.1','http://172.16.0.1','http://192.168.1.1','http://169.254.169.254','http://[::1]','http://[::ffff:127.0.0.1]','file:///etc/passwd','ftp://example.com','https://user:pass@example.com','https://example.com:3000','http://metadata.google.internal','http://router.local','http://0.0.0.0'])('blocks %s',url=>{expect(()=>normalizeUrl(url)).toThrow();});
 it.each(['10.1.2.3','100.64.0.1','192.168.0.2','172.31.0.2','169.254.169.254','127.0.0.1','0.0.0.0','224.0.0.1','255.255.255.255','::1','::','fc00::1','fe80::1','::ffff:192.168.1.1','2001:db8::1'])('rejects non-public IP %s',ip=>expect(publicIp(ip)).toBe(false));
 it('normalizes ordinary websites without permitting credentials',()=>{expect(normalizeUrl('example.com/path#top').href).toBe('https://example.com/path');expect(publicIp('93.184.216.34')).toBe(true);});
});
describe('deterministic website scoring',()=>{
 const response:SafeResponse={url:'https://example.com/',status:200,headers:{'content-type':'text/html','strict-transport-security':'max-age=31536000','x-content-type-options':'nosniff'},body:'<!doctype html><html><head><title>A useful page title for this website</title><meta name="description" content="Useful information"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://example.com/"></head><body><h1>Main heading</h1><h2>Details</h2><p>'+('Useful content '.repeat(120))+'</p><a href="/about">About</a><img src="a.png" alt="A useful illustration"></body></html>',bytes:3000,durationMs:200,redirects:0};
 it('explains exact category deductions and average',()=>{const audit=analyzeHtml(response);expect(audit.scores.SEO).toBe(96);expect(audit.scores.Technical).toBe(96);expect(audit.scores.Content).toBe(100);expect(audit.overall).toBe(99);expect(scoreIssues(audit.issues)).toEqual({scores:audit.scores,overall:audit.overall});});
 it('does not label basic measurements as Lighthouse',()=>{expect(analyzeHtml(response).performanceSource).toContain('Basic HTML');expect(analyzeHtml(response,{lighthouse:.43}).scores.Performance).toBe(43);});
 it('detects missing alt and noindex and grounds report plans in findings',()=>{const audit=analyzeHtml({...response,body:response.body.replace('alt="A useful illustration"','').replace('</head>','<meta name="robots" content="noindex"></head>')});expect(audit.issues.find(i=>i.code==='indexability')?.deduction).toBe(35);expect(audit.issues.find(i=>i.code==='image-alt')?.deduction).toBeGreaterThan(0);const report=ruleReport(audit);expect(report.source).toBe('rules');for(const item of report.recommendations)expect(audit.issues.some(i=>i.code===item.issueCode&&i.deduction>0)).toBe(true);for(const code of report.plan.flatMap(p=>p.issueCodes))expect(audit.issues.some(i=>i.code===code)).toBe(true);});
 it('handles malformed links and caps scores at zero',()=>{const audit=analyzeHtml({...response,body:'<h1>Only a heading</h1><a href="http://[broken">broken</a>'});for(const score of Object.values(audit.scores)){expect(score).toBeGreaterThanOrEqual(0);expect(score).toBeLessThanOrEqual(100);}});
});
