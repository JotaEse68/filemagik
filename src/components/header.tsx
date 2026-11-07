import Link from 'next/link';
import {WandSparkles,ArrowUpRight} from 'lucide-react';
import type {Locale} from '@/config/site';
import LanguageSwitcher from '@/components/language-switcher';
import MobileNavigation from '@/components/mobile-navigation';
import type {Dictionary} from '@/lib/i18n';
export default function Header({locale,d}:{locale:Locale;d:Dictionary}){
return <header className="site-header"><div className="container header-inner">
<Link href={`/${locale}`} className="logo"><span className="logo-mark"><WandSparkles size={22}/></span>File<span>Magik</span></Link>
<nav className="header-nav" aria-label="Primary navigation"><Link href={`/${locale}/pdf-studio`}>PDF Studio</Link><Link href={`/${locale}/tools`}>{d.navTools}</Link><Link href={`/${locale}#why`}>{d.navWhy}</Link><Link href={`/${locale}#how`}>{d.navHow}</Link></nav>
<div className="header-actions"><LanguageSwitcher locale={locale}/><Link className="small-cta" href={`/${locale}/tools`}>{d.allTools}<ArrowUpRight size={15}/></Link></div>
<MobileNavigation locale={locale} d={d}/></div></header>}