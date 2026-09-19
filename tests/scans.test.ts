import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  projects: [] as {id:string;user_id:string;url:string;name:string;notes:string}[],
  scans: [] as Record<string,unknown>[],
  userId: 'owner',
}));
vi.mock('next/server', () => ({ NextResponse: Response, after: vi.fn() }));
vi.mock('@/lib/analyzer/worker', () => ({ runScan: vi.fn() }));
vi.mock('@/lib/security/url', () => ({ normalizeUrl: (url:string) => new URL(url), resolvePublic: vi.fn() }));
vi.mock('@/lib/security/http', () => ({
  api: (fn:()=>Promise<Response>) => fn(), body: (req:Request) => req.json(),
  currentUser: () => ({id:state.userId}), originCheck: vi.fn(), rateLimit: vi.fn(),
  guestToken: vi.fn(), digest: vi.fn(), HttpError: Error,
}));
vi.mock('@/lib/supabase/server', () => ({ adminDb: () => ({
  from: (table:string) => ({
    upsert: async (row:typeof state.projects[number], options:{ignoreDuplicates?:boolean}) => {
      const existing=state.projects.find(p=>p.user_id===row.user_id&&p.url===row.url);
      if(existing){if(!options.ignoreDuplicates)Object.assign(existing,row);}
      else state.projects.push({...row,id:`project-${state.projects.length}`,notes:''});
      return {error:null};
    },
    select: () => {
      const filters:Record<string,string>={};
      const query={eq:(key:string,value:string)=>{filters[key]=value;return query;},single:async()=>({
        data:state.projects.find(p=>Object.entries(filters).every(([key,value])=>p[key as keyof typeof p]===value)),error:null,
      })};
      return query;
    },
    insert: (row:Record<string,unknown>) => {
      if(table==='website_scans')state.scans.push(row);
      return {select:()=>({single:async()=>({data:{id:'scan'},error:null})})};
    },
  }),
}) }));

import { POST } from '@/app/api/scans/route';
const request=()=>new Request('http://localhost/api/scans',{method:'POST',body:JSON.stringify({url:'https://example.com/'})});
beforeEach(()=>{state.projects=[];state.scans=[];state.userId='owner';});

it('rescans preserve custom project details and reuse the existing project',async()=>{
  state.projects.push({id:'saved',user_id:'owner',url:'https://example.com/',name:'My storefront',notes:'Keep my launch checklist'});
  expect((await POST(request())).status).toBe(202);
  expect((await POST(request())).status).toBe(202);
  expect(state.projects).toEqual([{id:'saved',user_id:'owner',url:'https://example.com/',name:'My storefront',notes:'Keep my launch checklist'}]);
  expect(state.scans.map(s=>s.website_project_id)).toEqual(['saved','saved']);
});

it('creates a separate project when another owner has scanned the same URL',async()=>{
  state.projects.push({id:'other-project',user_id:'another-owner',url:'https://example.com/',name:'Private project',notes:'Private notes'});
  expect((await POST(request())).status).toBe(202);
  expect(state.projects).toHaveLength(2);
  expect(state.projects[1]).toMatchObject({user_id:'owner',name:'example.com',notes:''});
  expect(state.scans[0].website_project_id).toBe(state.projects[1].id);
});
