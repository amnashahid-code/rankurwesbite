import type { MetadataRoute } from 'next';
import { brand } from '@/lib/config';
export default function sitemap():MetadataRoute.Sitemap{return ['','/privacy','/terms','/refunds','/cookies','/disclaimer','/contact'].map(path=>({url:`${brand.domain}${path}`,changeFrequency:'monthly',priority:path?0.3:1}));}
