import type {Locale,ToolSlug} from '@/config/site';
import {getToolCopy} from './tool-content';

/**
 * SEO title from the real localized value proposition, not English field labels.
 * Tool descriptions are reviewed independently in all four locales.
 */
export function toolSeoTitle(locale:Locale,slug:ToolSlug):string{
 const summary=getToolCopy(locale,slug).summary;
 const first=summary.split(/[.;]/)[0].trim();
 const max=55;
 const title=first.length>max?first.slice(0,max).replace(/\s+\S*$/,'').trim():first;
 return (title||slug.replaceAll('-',' '))+' | FileMagik';
}
export const socialLocale:Record<Locale,string>={en:'en_US',es:'es_ES',pt:'pt_BR',fr:'fr_FR'};
export const siteDescription:Record<Locale,string>={
 en:'Free browser tools to split and merge PDFs, convert images, process data and work with files.',
 es:'Herramientas gratuitas para dividir y unir PDF, convertir imágenes, procesar datos y trabajar con archivos.',
 pt:'Ferramentas gratuitas para dividir e juntar PDFs, converter imagens, processar dados e arquivos.',
 fr:'Outils gratuits pour diviser et fusionner des PDF, convertir des images et traiter des fichiers.'
};
