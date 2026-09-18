import type { Category, Issue, Scores } from '@/types';
export const categories: Category[]=['SEO','Performance','Mobile','Security','Technical','Content'];
export function scoreIssues(issues: Issue[], lighthouse?: number) {
 const scores=Object.fromEntries(categories.map(c=>[c,Math.max(0,100-issues.filter(i=>i.category===c).reduce((n,i)=>n+i.deduction,0))])) as Scores;
 if(lighthouse!==undefined) scores.Performance=Math.round(Math.max(0,Math.min(1,lighthouse))*100);
 const overall=Math.round(categories.reduce((n,c)=>n+scores[c],0)/categories.length);
 return {scores,overall};
}
