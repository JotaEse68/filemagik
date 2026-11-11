import {tools,type Locale,type ToolSlug} from '@/config/site';

/**
 * SEO title from the real localized value proposition, not English field labels.
 * Tool descriptions are reviewed independently in all four locales.
 */
const actionWords:Record<Locale,{verb:string;free:string}>={
 en:{verb:'Convert',free:'free online'},es:{verb:'Convertir',free:'gratis online'},
 pt:{verb:'Converter',free:'grátis online'},fr:{verb:'Convertir',free:'gratuit en ligne'}
};
export function toolSeoTitle(locale:Locale,slug:ToolSlug):string{
 const tool=tools.find(t=>t.slug===slug);
 if(!tool)return 'FileMagik';
 const words=actionWords[locale];
 const action=slug.includes('to-')||slug.includes('-to-')
  ? `${words.verb} ${tool.from} → ${tool.to}`
  : `${tool.to} · ${tool.from}`;
 const title=`${action} ${words.free}`;
 return (title.length>58?title.slice(0,58).replace(/\\s+\\S*$/,'').trim():title)+' | FileMagik';
}
export const seoFree:Record<Locale,string>={
 en:'Free online file converters and PDF tools. No paid plan required.',
 es:'Conversores de archivos y herramientas PDF gratis. Sin suscripciones ni planes de pago.',
 pt:'Conversores de arquivos e ferramentas PDF grátis. Sem planos pagos.',
 fr:'Convertisseurs de fichiers et outils PDF gratuits. Sans abonnement payant.'
};
export const socialLocale:Record<Locale,string>={en:'en_US',es:'es_ES',pt:'pt_BR',fr:'fr_FR'};
export const siteDescription:Record<Locale,string>={
 en:'Free browser tools to split and merge PDFs, convert images, process data and work with files.',
 es:'Herramientas gratuitas para dividir y unir PDF, convertir imágenes, procesar datos y trabajar con archivos.',
 pt:'Ferramentas gratuitas para dividir e juntar PDFs, converter imagens, processar dados e arquivos.',
 fr:'Outils gratuits pour diviser et fusionner des PDF, convertir des images et traiter des fichiers.'
};
