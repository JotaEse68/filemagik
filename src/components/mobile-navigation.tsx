'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {Menu,X} from 'lucide-react';
import type {Locale} from '@/config/site';
import type {Dictionary} from '@/lib/i18n';
import {categoryIds,categoryLabels} from '@/config/tool-navigation';
export default function MobileNavigation({locale,d}:{locale:Locale;d:Dictionary}){
 const [open,setOpen]=useState(false),pathname=usePathname();
 useEffect(()=>setOpen(false),[pathname]);
 const links=[{href:`/${locale}/pdf-studio`,label:'PDF Studio'},{href:`/${locale}#tools`,label:d.navTools},{href:`/${locale}#why`,label:d.navWhy},{href:`/${locale}#how`,label:d.navHow}];
 return <div className="mobile-nav">
  <button type="button" className="mobile-nav-toggle" aria-label={open?'Close menu':'Open menu'} aria-controls="mobile-navigation-panel" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<Menu size={24}/>}</button>
  {open&&<nav id="mobile-navigation-panel" aria-label={d.navTools} className="mobile-nav-panel" key={pathname}>
   {links.map(link=><Link key={link.href} href={link.href} onClick={()=>setOpen(false)}>{link.label}</Link>)}
   <div className="mobile-nav-categories">{categoryIds.filter(id=>id!=='all').map(id=><Link key={id} href={`/${locale}/tools?category=${id}`} onClick={()=>setOpen(false)}>{categoryLabels[locale][id]}</Link>)}</div>
  </nav>}
 </div>;
}
