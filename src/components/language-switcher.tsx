'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {locales,type Locale} from '@/config/site';
export default function LanguageSwitcher({locale}:{locale:Locale}){
 const pathname=usePathname();
 const suffix=pathname.replace(/^\/(en|es|pt|fr)(?=\/|$)/,'');
 return <nav className="lang-picker" aria-label="Language / Idioma">{locales.map(l=><Link key={l} href={`/${l}${suffix}`} hrefLang={l} aria-current={locale===l?'page':undefined} className={l===locale?'active':''}>{l.toUpperCase()}</Link>)}</nav>;
}