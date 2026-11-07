import type {MetadataRoute} from 'next';
import {siteUrl,locales,tools} from '@/config/site';
export default function sitemap():MetadataRoute.Sitemap{
 const paths=['','/tools','/pdf-studio',...tools.map(t=>'/'+t.slug)];
 return paths.flatMap((path,index)=>locales.map(locale=>({
  url:`${siteUrl}/${locale}${path}`,
  changeFrequency:(index<3?'weekly':'monthly') as 'weekly'|'monthly',
  priority:index===0?1:index===2?.95:index===1?.9:.8,
  alternates:{languages:Object.fromEntries([...locales.map(lang=>[lang,`${siteUrl}/${lang}${path}`]),['x-default',`${siteUrl}/en${path}`]])}
 })));
}
