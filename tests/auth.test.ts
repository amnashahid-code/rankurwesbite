import { beforeEach,expect,it,vi } from 'vitest';
import { safeNextPath } from '@/lib/auth/redirect';
const auth=vi.hoisted(()=>({verifyOtp:vi.fn(),exchangeCodeForSession:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({sessionDb:async()=>({auth})}));
vi.mock('@/lib/config',()=>({brand:{domain:'http://localhost:3000'}}));
import { GET as confirm } from '@/app/auth/confirm/route';
import { GET as callback } from '@/app/auth/callback/route';
beforeEach(()=>{vi.resetAllMocks();auth.verifyOtp.mockResolvedValue({error:null});auth.exchangeCodeForSession.mockResolvedValue({error:null});});
it.each(['//evil.example','/\\evil.example','/\n/evil.example','https://evil.example',null])('rejects unsafe auth redirects %s',value=>expect(safeNextPath(value)).toBe('/dashboard'));
it('preserves local report return paths',()=>expect(safeNextPath('/report/123?view=preview')).toBe('/report/123?view=preview'));
it('verifies signup tokens and sends the user to the dashboard',async()=>{
 const response=await confirm(new Request('http://localhost:3000/auth/confirm?token_hash=one-time-token&type=signup'));
 expect(auth.verifyOtp).toHaveBeenCalledWith({token_hash:'one-time-token',type:'signup'});
 expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
});
it('verifies recovery tokens before showing password reset',async()=>{
 const response=await confirm(new Request('http://localhost:3000/auth/confirm?token_hash=recovery-token&type=recovery'));
 expect(response.headers.get('location')).toBe('http://localhost:3000/auth/reset-password');
});
it('returns expired tokens to the sign-in error state',async()=>{
 auth.verifyOtp.mockResolvedValue({error:{message:'expired'}});
 const response=await confirm(new Request('http://localhost:3000/auth/confirm?token_hash=expired&type=signup'));
 expect(response.headers.get('location')).toBe('http://localhost:3000/auth/sign-in?error=verification');
});
it('exchanges the PKCE code and returns to the requested report',async()=>{
 const response=await callback(new Request('http://localhost:3000/auth/callback?code=pkce&next=/report/123'));
 expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce');
 expect(response.headers.get('location')).toBe('http://localhost:3000/report/123');
});
