import { test,expect } from '@playwright/test';
test('landing page is responsive, navigable, and labels illustrative data',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{name:/Find out why your/})).toBeVisible();await expect(page.getByText('Illustrative example',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Analyze My Website'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByText('Is the initial website scan really free?',{exact:true}).click();await expect(page.getByText('Yes. Your initial scan includes',{exact:false})).toBeVisible();expect(errors).toEqual([]);
});
test('authentication, legal pages and account protection',async({page})=>{
 await page.goto('/dashboard');await expect(page).toHaveURL(/auth\/sign-in/);await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();await page.getByRole('link',{name:'Forgot password?'}).click();await expect(page.getByRole('button',{name:'Send reset link'})).toBeVisible();await page.goto('/privacy');await expect(page.getByRole('heading',{name:'Privacy Policy'})).toBeVisible();await page.goto('/admin');await expect(page).toHaveURL(/auth\/sign-in/);
});
test('signup and invalid email links show real auth screens',async({page,request})=>{
 await page.goto('/auth/sign-up');await expect(page.getByRole('textbox',{name:'First name'})).toBeVisible();await expect(page.getByRole('button',{name:'Create account'})).toBeVisible();const response=await request.get('/auth/confirm?type=signup',{maxRedirects:0});expect(response.status()).toBe(307);const location=new URL(response.headers().location);expect(location.pathname+location.search).toBe('/auth/sign-in?error=verification');await page.goto(location.pathname+location.search);await expect(page.getByText('The verification link expired or could not be used. Please request another link.')).toBeVisible();
});
test('sample workspace is unavailable when demo access is disabled',async({request})=>{expect((await request.get('/demo/dashboard')).status()).toBe(404);});
test('unconfigured services show a customer-friendly scan error',async({page,request})=>{
 const stats=await request.get('/api/public/stats');if(stats.status()!==503)test.skip(true,'This check applies to unconfigured local development only.');await page.goto('/');await expect(page.getByText('Statistics currently unavailable')).toBeVisible();await page.getByRole('textbox',{name:'Website URL'}).fill('https://example.com');await page.getByRole('button',{name:'Analyze My Website'}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText("We couldn't analyze this website right now. Please check the URL and try again.");await expect(page.getByText(/npm run dev|configure supabase|missing environment/i)).toHaveCount(0);
});
