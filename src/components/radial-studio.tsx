'use client';
import Link from 'next/link';
import {useState} from 'react';
import {FileText,Image as ImageIcon,FileSpreadsheet,ScanText,FolderArchive,Files,ArrowUpRight,Layers2,Scissors,Merge,RotateCw,FileDown,Stamp,Minimize2,BookOpen,Search} from 'lucide-react';
import type {Locale} from '@/config/site';

const sections=['pdf','images','office','data','ocr','archives'] as const;
type Section=typeof sections[number];
type WheelItem={slug:string;label:string;icon:string};
const icons={pdf:FileText,images:ImageIcon,office:BookOpen,data:FileSpreadsheet,ocr:ScanText,archives:FolderArchive} as const;
const actions:Record<Section,WheelItem[]>={
 pdf:[{slug:'split-pdf-by-count',label:'SPLIT',icon:'cut'},{slug:'merge-pdf',label:'MERGE',icon:'merge'},{slug:'extract-pdf-pages',label:'EXTRACT',icon:'layers'},{slug:'compress-pdf-raster',label:'COMPRESS',icon:'shrink'},{slug:'rotate-pdf',label:'ROTATE',icon:'rotate'},{slug:'pdf-to-word-text',label:'PDF → WORD',icon:'file'}],
 images:[{slug:'jpg-to-webp',label:'JPG → WEBP',icon:'file'},{slug:'png-to-jpg',label:'PNG → JPG',icon:'file'},{slug:'images-to-pdf',label:'IMAGES → PDF',icon:'merge'},{slug:'webp-to-png',label:'WEBP → PNG',icon:'file'},{slug:'jpg-to-png',label:'JPG → PNG',icon:'file'},{slug:'image-cleanup',label:'CLEAN UP',icon:'layers'}],
 office:[{slug:'word-to-basic-pdf',label:'WORD → PDF',icon:'file'},{slug:'pdf-to-word-text',label:'PDF → WORD',icon:'file'},{slug:'word-to-text',label:'WORD → TXT',icon:'file'},{slug:'pdf-to-png',label:'PDF → PNG',icon:'file'},{slug:'merge-pdf',label:'MERGE PDF',icon:'merge'},{slug:'extract-pdf-pages',label:'PAGES',icon:'layers'}],
 data:[{slug:'xlsx-to-csv',label:'XLSX → CSV',icon:'file'},{slug:'csv-to-xlsx',label:'CSV → XLSX',icon:'file'},{slug:'csv-to-json',label:'CSV → JSON',icon:'file'},{slug:'json-to-csv',label:'JSON → CSV',icon:'file'},{slug:'split-pdf',label:'SPLIT PDF',icon:'cut'},{slug:'merge-pdf',label:'MERGE PDF',icon:'merge'}],
 ocr:[{slug:'ocr-image',label:'IMAGE OCR',icon:'scan'},{slug:'ocr-pdf',label:'PDF OCR',icon:'scan'},{slug:'image-cleanup',label:'REMOVE MARK',icon:'layers'},{slug:'pdf-to-word-text',label:'PDF → TEXT',icon:'file'},{slug:'word-to-text',label:'DOCX → TXT',icon:'file'},{slug:'pdf-to-png',label:'PDF → PNG',icon:'file'}],
 archives:[{slug:'create-zip',label:'CREATE ZIP',icon:'merge'},{slug:'extract-zip',label:'EXTRACT ZIP',icon:'layers'},{slug:'split-pdf',label:'PDF → ZIP',icon:'cut'},{slug:'pdf-to-png',label:'PDF → PNG ZIP',icon:'file'},{slug:'merge-pdf',label:'MERGE PDF',icon:'merge'},{slug:'images-to-pdf',label:'IMAGES → PDF',icon:'file'}]
};
const words={
 es:{title:'Elige un formato',actions:'¿Qué quieres hacer?',pdf:'PDF',images:'Imágenes',office:'Documentos',data:'Excel y datos',ocr:'OCR',archives:'ZIP',intro:'Convierte o transforma tus archivos con dos clics.',hint:'Selecciona una categoría y después la operación.',explore:'Ver todas las herramientas',featured:'Más utilizadas',split:'Dividir PDF',merge:'Unir PDF',remove:'Limpiar imagen'},
 en:{title:'Choose a format',actions:'What do you want to do?',pdf:'PDF',images:'Images',office:'Documents',data:'Excel & data',ocr:'OCR',archives:'ZIP',intro:'Convert and transform files in two clicks.',hint:'Choose a category, then pick an action.',explore:'Browse all tools',featured:'Popular shortcuts',split:'Split PDF',merge:'Merge PDF',remove:'Clean image'},
 pt:{title:'Escolha um formato',actions:'O que deseja fazer?',pdf:'PDF',images:'Imagens',office:'Documentos',data:'Excel e dados',ocr:'OCR',archives:'ZIP',intro:'Converta arquivos em dois cliques.',hint:'Escolha uma categoria e depois uma ação.',explore:'Ver ferramentas',featured:'Acessos rápidos',split:'Dividir PDF',merge:'Unir PDF',remove:'Limpar imagem'},
 fr:{title:'Choisissez un format',actions:'Que voulez-vous faire ?',pdf:'PDF',images:'Images',office:'Documents',data:'Excel et données',ocr:'OCR',archives:'ZIP',intro:'Transformez vos fichiers en deux clics.',hint:'Choisissez la catégorie, puis une action.',explore:'Voir les outils',featured:'Accès rapides',split:'Diviser PDF',merge:'Fusionner PDF',remove:'Nettoyer une image'}
} as const;
const symbols={cut:Scissors,merge:Merge,layers:Layers2,shrink:Minimize2,rotate:RotateCw,file:FileDown,scan:Search} as const;

export default function RadialStudio({locale}:{locale:Locale}){
 const [selected,setSelected]=useState<Section>('pdf');
 const [hovered,setHovered]=useState<string|null>(null);
 const t=words[locale];
 const ring=actions[selected];
 const fallback=ring.find(a=>a.slug===hovered)??ring[0];
 return <section className="radial-studio" aria-label={t.intro}>
  <div className="radial-top"><div><span className="radial-kicker">FILEMAGIK · QUICK STUDIO</span><h2>{t.intro}</h2><p>{t.hint}</p></div><Link href={`/${locale}/tools`} className="radial-all-link">{t.explore}<ArrowUpRight size={16}/></Link></div>
  <div className="radial-wheels">
   <div className="radial-column"><h3><span className="radial-step">01</span>{t.title}</h3>
    <div className="radial-wheel radial-category-wheel" role="group" aria-label={t.title}>
     <div className="wheel-disc"/>
     {sections.map((category,index)=>{
      const Icon=icons[category],angle=index*60-90;
      return <button type="button" className={`radial-sector ${selected===category?'is-active':''}`} key={category} style={{'--angle':`${angle}deg`} as React.CSSProperties} aria-pressed={selected===category} onClick={()=>{setSelected(category);setHovered(null);}}><Icon size={26}/><span>{t[category]}</span></button>
     })}
     <div className="wheel-center"><Files size={22}/><span>{t[selected]}</span></div>
    </div>
   </div>
   <div className="radial-connection"><span/><ArrowUpRight size={28}/><span/></div>
   <div className="radial-column"><h3><span className="radial-step">02</span>{t.actions}</h3>
    <div className="radial-wheel radial-action-wheel" role="group" aria-label={t.actions}>
     <div className="wheel-disc"/>
     {ring.map((action,index)=>{const Icon=symbols[action.icon as keyof typeof symbols]??Stamp;const angle=index*60-90;return <Link href={`/${locale}/${action.slug}`} key={action.slug} onMouseEnter={()=>setHovered(action.slug)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(action.slug)} className={`radial-sector radial-sector-link ${fallback.slug===action.slug?'is-active':''}`} style={{'--angle':`${angle}deg`} as React.CSSProperties}><Icon size={25}/><span>{action.label}</span></Link>})}
     <Link href={`/${locale}/${fallback.slug}`} className="wheel-center wheel-action-center" aria-label={fallback.label}><ArrowUpRight size={19}/><span>{fallback.label}</span></Link>
    </div>
   </div>
  </div>
  <div className="radial-shortcuts"><span>{t.featured}</span><Link href={`/${locale}/split-pdf-by-count`}><Scissors size={17}/>{t.split}</Link><Link href={`/${locale}/merge-pdf`}><Merge size={17}/>{t.merge}</Link><Link href={`/${locale}/image-cleanup`}><ImageIcon size={17}/>{t.remove}</Link></div>
 </section>;
}
