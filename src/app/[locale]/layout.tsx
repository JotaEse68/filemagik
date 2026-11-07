import '../globals.css';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {isLocale,locales,siteUrl} from '@/config/site';
import {getDictionary} from '@/lib/i18n';
import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata:Metadata={
 applicationName:'FileMagik',
 metadataBase:new URL(siteUrl),
 verification:{
  google:process.env.NEXT_PUBLIC_GSC_VERIFICATION||undefined,
  other:process.env.NEXT_PUBLIC_BING_VERIFICATION?{'msvalidate.01':process.env.NEXT_PUBLIC_BING_VERIFICATION}:{}
 }
};
export function generateStaticParams(){return locales.map(locale=>({locale}));}
const skipLabels={en:'Skip to main content',es:'Saltar al contenido',pt:'Ir para o conteúdo',fr:'Aller au contenu'} as const;
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();
 const d=getDictionary(locale);
 return <html lang={locale}><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"/></head><body>
  <a className="skip-link" href="#main-content">{skipLabels[locale]}</a>
  <Header locale={locale} d={d}/>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <Footer locale={locale} d={d}/>
 </body></html>;
}
