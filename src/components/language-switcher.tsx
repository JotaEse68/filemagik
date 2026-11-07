'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {locales,type Locale} from '@/config/site';
const labels={en:'Language',es:'Idioma',pt:'Idioma',fr:'Langue'} as const;
export default function LanguageSwitcher({locale}:{locale:Locale}){
 const pathname=usePathname(),router=useRouter();
 const suffix=pathname.replace(/^\/(en|es|pt|fr)(?=\/|$)/,'');
 return <>
  <nav className="lang-picker" aria-label={labels[locale]}>
   {locales.map(l=><Link key={l} href={`/${l}${suffix}`} hrefLang={l} aria-current={locale===l?'page':undefined} className={l===locale?'active':''}>{l.toUpperCase()}</Link>)}
  </nav>
  <label className="lang-picker-mobile">
   <span className="visually-hidden">{labels[locale]}</span>
   <select aria-label={labels[locale]} value={locale} onChange={event=>router.push(`/${event.target.value}${suffix}`)}>
    {locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}
   </select>
  </label>
 </>;
}
