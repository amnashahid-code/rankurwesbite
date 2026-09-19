import type { MetadataRoute } from 'next';
import { brand } from '@/lib/config';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/dashboard','/admin','/api/','/report/','/scan/','/auth/','/checkout/','/r/']},sitemap:`${brand.domain}/sitemap.xml`};}
