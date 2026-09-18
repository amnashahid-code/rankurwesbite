import * as cheerio from 'cheerio';
import { safeFetch, type SafeResponse } from '@/lib/security/url';
import { scoreIssues } from '@/lib/scoring';
import type { Audit, Category, Issue } from '@/types';

export function analyzeHtml(page: SafeResponse, extras: {robots?:SafeResponse|null;sitemap?:SafeResponse|null;broken?:string[];lighthouse?:number;limitations?:string[]}={}): Audit {
 const $=cheerio.load(page.body); const issues:Issue[]=[];
 function check(code:string,category:Category,pass:boolean,deduction:number,title:string,evidence:string,recommendation:string) {
  issues.push({code,category,severity:pass?'Passed':deduction>=25?'Critical':deduction>=15?'High':deduction>=8?'Medium':'Low',deduction:pass?0:deduction,title,evidence,recommendation:pass?'Keep this check passing.':recommendation});
 }
 const title=$('title').first().text().trim(); const description=$('meta[name="description" i]').attr('content')?.trim()||'';
 const h1=$('h1').length,h2=$('h2').length,images=$('img').length;
 const missingAlt=$('img').filter((_,el)=>$(el).attr('alt')===undefined).length;
 const robots=[$('meta[name="robots" i]').attr('content')||'',String(page.headers['x-robots-tag']||'')].join(',');
 const canonical=$('link[rel="canonical" i]').attr('href')||'';
 let canonicalValid=false;try{canonicalValid=!!canonical && ['http:','https:'].includes(new URL(canonical,page.url).protocol);}catch{}
 const viewport=$('meta[name="viewport" i]').attr('content')||'';
 let validSchema=0,invalidSchema=0;$('script[type="application/ld+json"]').each((_,el)=>{try{const parsed=JSON.parse($(el).text());if(parsed&&typeof parsed==='object')validSchema++;else invalidSchema++;}catch{invalidSchema++;}});
 const links:string[]=[];$('a[href]').each((_,el)=>{try{const url=new URL($(el).attr('href')!,page.url);if(['http:','https:'].includes(url.protocol)){url.hash='';links.push(url.href);}}catch{}});
 const origin=new URL(page.url).origin;const internal=[...new Set(links.filter(l=>new URL(l).origin===origin))];const external=[...new Set(links.filter(l=>new URL(l).origin!==origin))];
 $('script,style,nav,footer,noscript').remove();const words=$('body').text().trim().split(/\s+/).filter(Boolean).length;
 check('https','Security',page.url.startsWith('https:'),30,'HTTPS connection',page.url.startsWith('https:')?'HTTPS is enabled.':'The final page uses HTTP.','Serve the website over HTTPS and redirect HTTP requests.');
 check('http-status','Technical',page.status>=200&&page.status<300,30,'Successful HTTP response',`HTTP ${page.status}`,'Resolve server or access errors on this page.');
 check('redirects','Technical',page.redirects<=1,8,'Redirect chain',`${page.redirects} redirects`,'Point links to the final URL and remove unnecessary redirect hops.');
 check('title-present','SEO',title.length>0,20,'Page title',title.slice(0,200)||'No title element was found.','Write a unique title that describes the page and its primary topic.');
 if(title)check('title-length','SEO',title.length>=20&&title.length<=65,5,'Title length',`${title.length} characters`,'Review the title for clarity; around 20–65 characters is a useful editorial guideline, not a Google rule.');
 check('meta-description','SEO',!!description,8,'Meta description',description.slice(0,240)||'No meta description was found.','Add an accurate, useful summary to encourage relevant search clicks.');
 check('h1','SEO',h1===1,12,'Primary heading',`${h1} H1 headings`,'Use one clear primary heading that describes the page.');
 check('h2','Content',h2>0,8,'Content structure',`${h2} H2 headings`,'Group substantial content with meaningful subheadings.');
 check('canonical','Technical',canonicalValid,10,'Canonical URL',canonical.slice(0,240)||'No canonical link was found.','Add an absolute canonical URL for the preferred version of this page.');
 check('indexability','SEO',!/(?:^|[,\s])(noindex|none)(?:$|[,\s])/i.test(robots),35,'Indexing directives',robots||'No noindex directive detected.','If this page should appear in search, remove unintended noindex directives.');
 check('viewport','Mobile',/width\s*=\s*device-width/i.test(viewport),35,'Responsive viewport',viewport||'No viewport meta tag was found.','Add a viewport meta tag with width=device-width, initial-scale=1.');
 check('zoom','Mobile',!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i.test(viewport),15,'User zoom',viewport||'Zoom restriction not detected.','Allow users to zoom for accessibility.');
 check('open-graph','SEO',!!$('meta[property="og:title"]').attr('content')&&!!$('meta[property="og:description"]').attr('content'),4,'Social sharing metadata','Checks og:title and og:description.','Add accurate Open Graph title and description tags.');
 check('schema','Technical',validSchema>0,4,'Structured data',`${validSchema} parseable JSON-LD blocks; ${invalidSchema} invalid blocks`,'Add relevant JSON-LD and validate it with a structured data testing tool.');
 if(invalidSchema)check('schema-invalid','Technical',false,8,'Invalid JSON-LD',`${invalidSchema} unparseable blocks`,'Correct JSON syntax in structured data scripts.');
 check('image-alt','Content',missingAlt===0,Math.min(18,missingAlt*3+3),'Image alternative text',`${missingAlt} of ${images} images missing an alt attribute`,'Add meaningful alt text to informative images; use empty alt text for decoration.');
 check('content-depth','Content',words>=200,15,'Visible text content',`${words} words in initial HTML`,'Review whether the page sufficiently answers its intended question. Word count is only a rough signal.');
 check('internal-links','Content',internal.length>0,12,'Internal navigation',`${internal.length} unique internal links`,'Connect this page to relevant pages using descriptive internal links.');
 check('html-size','Performance',page.bytes<300000,20,'HTML payload',`${Math.round(page.bytes/1024)} KB (HTML only)`,'Reduce unnecessary HTML and excessive inline data.');
 check('response-time','Performance',page.durationMs<1500,25,'HTML fetch time',`${page.durationMs} ms from this scanner`,'Review origin response time and caching. This measurement includes network latency and redirects.');
 check('hsts','Security',!!page.headers['strict-transport-security'],10,'HSTS header',page.headers['strict-transport-security']?'Header present.':'Header absent.','After confirming HTTPS works everywhere, configure Strict-Transport-Security.');
 check('nosniff','Security',page.headers['x-content-type-options']==='nosniff',8,'Content type protection',String(page.headers['x-content-type-options']||'Header absent.'),'Set X-Content-Type-Options: nosniff.');
 if(extras.robots) check('robots-file','Technical',extras.robots.status===200&&!/<html/i.test(extras.robots.body),6,'robots.txt',`HTTP ${extras.robots.status}`,'Publish a valid robots.txt appropriate to your crawl policy.');
 if(extras.sitemap)check('sitemap','Technical',extras.sitemap.status===200&&/<(?:urlset|sitemapindex)\b/i.test(extras.sitemap.body),6,'XML sitemap',`HTTP ${extras.sitemap.status}`,'Publish a sitemap.xml or declare your actual sitemap in robots.txt.');
 if(extras.broken?.length)check('broken-links','Technical',false,12,'Broken internal links',extras.broken.join('\n').slice(0,1000),'Fix or remove these links. Only a small sample was checked.');
 const scores=scoreIssues(issues,extras.lighthouse);
 return {url:page.url,scannedAt:new Date().toISOString(),...scores,issues,facts:{title,description,h1,h2,images,missingAlt,words,internalLinks:internal.length,externalLinks:external.length,htmlBytes:page.bytes,fetchMs:page.durationMs,httpStatus:page.status,redirects:page.redirects,canonical,robots,checkedInternalLinks:internal.slice(0,3)},performanceSource:extras.lighthouse!==undefined?'Google Lighthouse (mobile lab)':'Basic HTML signals — not a Core Web Vitals measurement',limitations:['Single-page, initial-HTML audit. JavaScript-rendered content, full-site crawling, visual layout and real-user metrics are not evaluated.','Scores are diagnostic estimates, not Google rankings. Security checks are not a penetration test.','Robots directives are reported as signals; complete crawler-specific robots.txt matching is not evaluated.',...(extras.limitations||[])]};
}
export async function analyzeWebsite(url:string,progress:(n:number,stage:string)=>Promise<void>) {
 await progress(15,'Fetching your website');const page=await safeFetch(url);
 if(page.status<200||page.status>=400)throw new Error(`The website returned HTTP ${page.status}.`);
 if(!/text\/html|application\/xhtml\+xml/i.test(String(page.headers['content-type'])))throw new Error('The URL did not return an HTML page.');
 await progress(35,'Checking metadata and crawl signals');const origin=new URL(page.url).origin;const limitations:string[]=[];
 const [robots,sitemap]=await Promise.all([safeFetch(`${origin}/robots.txt`,{maxBytes:200000,timeoutMs:5000}).catch(()=>null),safeFetch(`${origin}/sitemap.xml`,{maxBytes:500000,timeoutMs:5000}).catch(()=>null)]);
 if(!robots)limitations.push('robots.txt could not be retrieved.');if(!sitemap)limitations.push('sitemap.xml could not be retrieved.');
 const initial=analyzeHtml(page);const links=initial.facts.checkedInternalLinks as string[];
 await progress(50,'Checking a sample of internal links');
 const checked=await Promise.all(links.map(async link=>{try{const result=await safeFetch(link,{method:'HEAD',timeoutMs:4000});return result.status===404||result.status===410?link:null;}catch{return null;}}));
 let lighthouse:number|undefined;
 if(process.env.PAGESPEED_API_KEY){
  await progress(65,'Measuring mobile performance with PageSpeed');
  try{const query=new URLSearchParams({url:page.url,key:process.env.PAGESPEED_API_KEY,strategy:'mobile',category:'performance'});const res=await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${query}`,{signal:AbortSignal.timeout(35000)});if(!res.ok)throw new Error();const data=await res.json();const value=data.lighthouseResult?.categories?.performance?.score;if(typeof value==='number')lighthouse=value;else throw new Error();}catch{limitations.push('PageSpeed was unavailable; the performance score uses basic HTML signals.');}
 }else limitations.push('PageSpeed is not connected. Performance uses basic HTML signals.');
 await progress(80,'Calculating scores and building your action plan');
 return analyzeHtml(page,{robots,sitemap,broken:checked.filter((x):x is string=>!!x),lighthouse,limitations});
}
