'use client';
import Link from 'next/link';
import AdSlot from '@/components/advertising/ad-slot';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,FileText,FileSpreadsheet,Files,ImageIcon,ScanText,Search,X} from 'lucide-react';
import type {Locale} from '@/config/site';
import {categoryCounts,categoryIds,categoryLabels,searchTools,type ToolCategory} from '@/config/tool-navigation';
const text={
 en:{search:'Search by format or action…',empty:'No matching tools. Try another format.',heading:'Choose a tool'},
 es:{search:'Busca por formato o acción…',empty:'No hay herramientas que coincidan. Prueba otro formato.',heading:'Elige una herramienta'},
 pt:{search:'Pesquise por formato ou ação…',empty:'Nenhuma ferramenta encontrada. Tente outro formato.',heading:'Escolha uma ferramenta'},
 fr:{search:'Rechercher un format ou une action…',empty:'Aucun outil trouvé. Essayez un autre format.',heading:'Choisissez un outil'}
} as const;
export default function ToolExplorer({locale,initialCategory='all'}:{locale:Locale;initialCategory?:ToolCategory}){
 const [category,setCategory]=useState<ToolCategory>(initialCategory),[query,setQuery]=useState('');
 useEffect(()=>setCategory(initialCategory),[initialCategory]);
 const list=useMemo(()=>searchTools(query,category),[query,category]);
 const language=text[locale],labels=categoryLabels[locale];
 return <div className="tool-explorer" aria-label={language.heading}>
  <div className="tool-explorer-heading">
   <label htmlFor="tool-search" className="tool-search">
    <Search size={18} aria-hidden="true"/>
    <input id="tool-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={language.search}/>
    {query&&<button type="button" aria-label={locale==="es"?"Limpiar búsqueda":locale==="pt"?"Limpar pesquisa":locale==="fr"?"Effacer la recherche":"Clear search"} onClick={()=>setQuery('')}><X size={17}/></button>}
   </label>
   <span className="tool-result-count" aria-live="polite">{list.length} / {categoryCounts.all}</span>
  </div>
  <div role="group" aria-label={language.heading} className="category-tabs">
   {categoryIds.map(id=><button key={id} type="button" className={category===id?'category-tab active':'category-tab'} aria-pressed={category===id} onClick={()=>setCategory(id)}>{labels[id]} <span>{categoryCounts[id]}</span></button>)}
  </div>
  <div className="fm-toolbox-ad"><AdSlot slot="popularTop" label="Publicidad"/></div>
  {list.length?<div className="tool-grid">{list.map(tool=>{
   const Icon=tool.category==='images'?ImageIcon:tool.category==='data'?FileSpreadsheet:tool.category==='ocr'?ScanText:tool.category==='office'?FileText:Files;
   return <Link className="tool-card" href={`/${locale}/${tool.slug}`} key={tool.slug}>
    <span className="tool-icon"><Icon size={23} aria-hidden="true"/></span>
    <div><h3>{tool.from} → {tool.to}</h3><p>{labels[tool.category]}</p></div>
    <ArrowUpRight className="tool-arrow" size={19} aria-hidden="true"/>
   </Link>})}</div>:<p role="status" className="tool-explorer-empty">{language.empty}</p>}
 </div>
}
