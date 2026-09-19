import { z } from 'zod';
import type { Audit, ReportContent } from '@/types';
export function ruleReport(audit:Audit):ReportContent {
 const problems=audit.issues.filter(i=>i.deduction>0).sort((a,b)=>b.deduction-a.deduction);
 return {audit,summary:`This page scored ${audit.overall}/100 across six diagnostic categories. ${problems.length} checks need attention. Start with the highest-impact issues and re-scan after making changes.`,strengths:audit.issues.filter(i=>i.severity==='Passed').map(i=>i.title),recommendations:problems.map(i=>({issueCode:i.code,explanation:i.recommendation})),plan:[1,2,3,4].map((week)=>({week,issueCodes:problems.slice((week-1)*Math.ceil(problems.length/4),week*Math.ceil(problems.length/4)).map(i=>i.code),action:week===1?'Resolve the highest-priority findings.':week===4?'Finish remaining improvements, validate changes, and run another audit.':'Implement and verify the next group of findings.'})),source:'rules'};
}
const aiSchema=z.object({recommendations:z.array(z.object({issueCode:z.string(),explanation:z.string().max(1500)})).max(40)});
export async function createReport(audit:Audit,aiEnabled:boolean):Promise<ReportContent> {
 const report=ruleReport(audit);
 if(!aiEnabled||!process.env.GEMINI_API_KEY||!process.env.GEMINI_MODEL)return report;
 try {
  // Only controlled finding titles and recommendations reach the model, not untrusted page text.
  const findings=audit.issues.filter(i=>i.deduction>0).map(({code,title,recommendation,category})=>({code,title,recommendation,category}));
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},signal:AbortSignal.timeout(25000),body:JSON.stringify({systemInstruction:{parts:[{text:'Explain how to fix ONLY the supplied detected checks. Do not introduce additional issues, scores, measurements, rankings or guarantees. Return JSON with recommendations: [{issueCode, explanation}]. Each explanation is practical fix guidance, not a new diagnosis.'}]},contents:[{parts:[{text:JSON.stringify(findings)}]}],generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:5000}})});
  if(!response.ok)return report;const payload=await response.json();const output=aiSchema.parse(JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text||''));
  const codes=new Set(findings.map(f=>f.code));
  if(output.recommendations.some(r=>!codes.has(r.issueCode))||new Set(output.recommendations.map(r=>r.issueCode)).size!==findings.length)return report;
  return {...report,recommendations:output.recommendations,source:'ai'};
 }catch{return report;}
}
