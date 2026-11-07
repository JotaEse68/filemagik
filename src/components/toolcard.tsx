import Link from 'next/link';
import {ArrowUpRight,FileSpreadsheet,FileText,Image as ImageIcon,Files} from 'lucide-react';
import type {Locale} from '@/config/site';
import {tools} from '@/config/site';
export default function ToolCards({locale}:{locale:Locale}){return <div className="tool-grid">{tools.map(t=>{
 const Icon=t.kind==='image'?ImageIcon:t.kind==='data'?FileSpreadsheet:t.kind==='pdf'?Files:FileText;
 return <Link className="tool-card" href={`/${locale}/${t.slug}`} key={t.slug}><span className="tool-icon"><Icon size={23}/></span><div><h3>{t.from} → {t.to}</h3><p>{t.kind.toUpperCase()}</p></div><ArrowUpRight className="tool-arrow" size={19}/></Link>})}</div>}