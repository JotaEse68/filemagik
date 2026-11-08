import '../globals.css';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {DM_Sans,Space_Grotesk} from 'next/font/google';
import {isLocale,locales,siteUrl} from '@/config/site';
import {getDictionary} from '@/lib/i18n';
import Header from '@/components/header';
import Footer from '@/components/footer';
import AdSlot from '@/components/advertising/ad-slot';

const dmSans=DM_Sans({subsets:['latin'],display:'swap',variable:'--font-dm'});
const spaceGrotesk=Space_Grotesk({subsets:['latin'],display:'swap',variable:'--font-space'});
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
 return <html lang={locale} className={`${dmSans.variable} ${spaceGrotesk.variable}`}><body>
  <a className="skip-link" href="#main-content">{skipLabels[locale]}</a>
  <Header locale={locale} d={d}/>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <Footer locale={locale} d={d}/>
  <aside className="fm-global-desktop-ad" aria-label="Publicidad lateral"><AdSlot slot="desktop" label="Publicidad superior"/><AdSlot slot="desktopLower" label="Publicidad inferior"/></aside>
  <div className="fm-global-mobile-ad"><AdSlot slot="mobile" label="Publicidad inferior"/></div>
 </body></html>;
}
