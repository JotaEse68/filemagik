import '../globals.css';
import {notFound} from 'next/navigation';
import {isLocale,locales} from '@/config/site';
import {getDictionary} from '@/lib/i18n';
import Header from '@/components/header';
import Footer from '@/components/footer';

export function generateStaticParams(){return locales.map(locale=>({locale}));}
const skipLabels={en:'Skip to main content',es:'Saltar al contenido',pt:'Ir para o conteúdo',fr:'Aller au contenu'} as const;
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
 const {locale}=await params;if(!isLocale(locale))notFound();
 const d=getDictionary(locale);
 return <html lang={locale}><body>
  <a className="skip-link" href="#main-content">{skipLabels[locale]}</a>
  <Header locale={locale} d={d}/>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <Footer locale={locale} d={d}/>
 </body></html>;
}
