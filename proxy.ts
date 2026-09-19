import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function proxy(request: NextRequest) {
 if(request.nextUrl.pathname==='/demo'||request.nextUrl.pathname.startsWith('/demo/')){
  if(process.env.ENABLE_DEMO!=='true'||process.env.NODE_ENV!=='development'||process.env.APP_ENV==='production')
   return new NextResponse('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  return NextResponse.next();
 }
 let response = NextResponse.next({request});
 if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return response;
 const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
  getAll: () => request.cookies.getAll(),
  setAll(values) { values.forEach(({name,value}) => request.cookies.set(name,value)); response=NextResponse.next({request}); values.forEach(({name,value,options}) => response.cookies.set(name,value,options)); },
 }});
 await client.auth.getUser();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config = { matcher: ['/demo/:path*','/dashboard/:path*','/admin/:path*','/auth/:path*','/report/:path*','/scan/:path*','/checkout/:path*','/api/auth/:path*','/api/scans/:path*','/api/account/:path*','/api/payments/:path*','/api/rankings/:path*','/api/admin/:path*'] };
