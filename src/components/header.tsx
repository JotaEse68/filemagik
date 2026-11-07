import Link from 'next/link';
import {WandSparkles,ArrowUpRight} from 'lucide-react';
import {locales,type Locale} from '@/config/site';
import type {Dictionary} from '@/lib/i18n';
export default function Header({locale,d}:{locale:Locale;d:Dictionary}){
return <header className="site-header"><div className="container header-inner">
<Link href={`/${locale}`} className="logo"><span className="logo-mark"><WandSparkles size={22}/></span>File<span>Magik</span></Link>
<nav className="header-nav"><Link href={`/${locale}#tools`}>{d.navTools}</Link><Link href={`/${locale}#why`}>{d.navWhy}</Link><Link href={`/${locale}#how`}>{d.navHow}</Link></nav>
<div className="header-actions"><div className="lang-picker">{locales.map(l=><Link key={l} href={`/${l}`} hrefLang={l} aria-current={locale===l?'page':undefined} className={l===locale?'active':''}>{l.toUpperCase()}</Link>)}</div><Link className="small-cta" href={`/${locale}#tools`}>{d.allTools}<ArrowUpRight size={15}/></Link></div>
</div></header>}