import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {isLocale,siteUrl,locales} from '@/config/site';
import {categoryIds,categoryLabels,type ToolCategory} from '@/config/tool-navigation';
import ToolExplorer from '@/components/tool-explorer';
import {siteDescription,socialLocale} from '@/lib/seo';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
 const {locale}=await params;if(!isLocale(locale))return {};
 return {title:`${categoryLabels[locale].all} | FileMagik`,description:siteDescription[locale],robots:{index:true,follow:true},openGraph:{title:`${categoryLabels[locale].all} | FileMagik`,description:siteDescription[locale],url:`${siteUrl}/${locale}/tools`,locale:socialLocale[locale],type:'website'},alternates:{canonical:`${siteUrl}/${locale}/tools`,languages:Object.fromEntries([...locales.map(l=>[l,`${siteUrl}/${l}/tools`]),['x-default',`${siteUrl}/en/tools`]])}};
}
export default async function ToolsPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{category?:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();
 const {category}=await searchParams;
 const selected:ToolCategory=categoryIds.includes(category as ToolCategory)?category as ToolCategory:'all';
 return <section className="section tools-directory"><div className="container">
 <div className="section-heading"><div><span className="eyebrow-line">FILEMAGIK STUDIO</span><h1>{categoryLabels[locale].all}</h1></div></div>
 <ToolExplorer locale={locale} initialCategory={selected}/>
 </div></section>;
}