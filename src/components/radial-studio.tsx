'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {CSSProperties} from 'react';
import {FileText,Image as ImageIcon,FileSpreadsheet,ScanText,FolderArchive,Files,ArrowUpRight,Layers2,Scissors,Merge,RotateCw,FileDown,Stamp,Minimize2,BookOpen,Search} from 'lucide-react';
import type {Locale} from '@/config/site';

const sections=['pdf','images','office','data','ocr','archives'] as const;
type Section=typeof sections[number];
type WheelItem={slug:string;label:string;icon:string};
const icons={pdf:FileText,images:ImageIcon,office:BookOpen,data:FileSpreadsheet,ocr:ScanText,archives:FolderArchive} as const;
const actions:Record<Section,WheelItem[]>={
 pdf:[{slug:'split-pdf-by-count',label:'SPLIT',icon:'cut'},{slug:'merge-pdf',label:'MERGE',icon:'merge'},{slug:'extract-pdf-pages',label:'EXTRACT',icon:'layers'},{slug:'compress-pdf-lossless',label:'OPTIMIZE PDF',icon:'shrink'},{slug:'rotate-pdf',label:'ROTATE',icon:'rotate'},{slug:'pdf-to-word-text',label:'PDF → WORD',icon:'file'}],
 images:[{slug:'jpg-to-webp',label:'JPG → WEBP',icon:'file'},{slug:'png-to-jpg',label:'PNG → JPG',icon:'file'},{slug:'images-to-pdf',label:'IMAGES → PDF',icon:'merge'},{slug:'webp-to-png',label:'WEBP → PNG',icon:'file'},{slug:'jpg-to-png',label:'JPG → PNG',icon:'file'},{slug:'batch-images-to-webp',label:'BATCH WEBP',icon:'layers'}],
 office:[{slug:'word-to-basic-pdf',label:'WORD → PDF',icon:'file'},{slug:'pdf-to-word-text',label:'PDF → WORD',icon:'file'},{slug:'word-to-text',label:'WORD → TXT',icon:'file'},{slug:'pdf-to-png',label:'PDF → PNG',icon:'file'},{slug:'merge-pdf',label:'MERGE PDF',icon:'merge'},{slug:'extract-pdf-pages',label:'PAGES',icon:'layers'}],
 data:[{slug:'xlsx-to-csv',label:'XLSX → CSV',icon:'file'},{slug:'csv-to-xlsx',label:'CSV → XLSX',icon:'file'},{slug:'csv-to-json',label:'CSV → JSON',icon:'file'},{slug:'json-to-csv',label:'JSON → CSV',icon:'file'},{slug:'split-pdf',label:'SPLIT PDF',icon:'cut'},{slug:'merge-pdf',label:'MERGE PDF',icon:'merge'}],
 ocr:[{slug:'ocr-image',label:'IMAGE OCR',icon:'scan'},{slug:'ocr-pdf-searchable',label:'SEARCHABLE PDF',icon:'scan'},{slug:'image-cleanup',label:'REMOVE MARK',icon:'layers'},{slug:'pdf-to-word-text',label:'PDF → TEXT',icon:'file'},{slug:'word-to-text',label:'DOCX → TXT',icon:'file'},{slug:'pdf-to-png',label:'PDF → PNG',icon:'file'}],
 archives:[{slug:'create-zip',label:'CREATE ZIP',icon:'merge'},{slug:'extract-zip',label:'EXTRACT ZIP',icon:'layers'},{slug:'rename-batch',label:'RENAME FILES',icon:'file'},{slug:'inspect-file',label:'FILE INFO',icon:'scan'},{slug:'pdf-to-png',label:'PDF → PNG ZIP',icon:'file'},{slug:'images-to-pdf',label:'IMAGES → PDF',icon:'file'}]
};
const words={
 es:{title:'1. Selecciona tu tipo de archivo',actions:'2. ¿Qué necesitas hacer?',pdf:'PDF',images:'Imágenes',office:'Documentos',data:'Excel y datos',ocr:'OCR',archives:'ZIP',intro:'Convierte o transforma tus archivos con dos clics.',hint:'Primero escoge el archivo en la rueda izquierda. Después pulsa la acción en la derecha.',explore:'Ver todas las herramientas',featured:'Más utilizadas',split:'Dividir PDF',merge:'Unir PDF',remove:'Limpiar imagen',steps:["Elige un tipo de archivo","Selecciona una acción","Sube tu archivo y descarga"],active:'Seleccionado',next:'Ahora elige una acción en la rueda derecha',start:'Empieza por aquí',help:'¿Cómo funciona?'},
 en:{title:'1. Choose your file type',actions:'2. What do you want to do?',pdf:'PDF',images:'Images',office:'Documents',data:'Excel & data',ocr:'OCR',archives:'ZIP',intro:'Convert and transform files in two clicks.',hint:'First choose your file in the left wheel. Then choose the action on the right.',explore:'Browse all tools',featured:'Popular shortcuts',split:'Split PDF',merge:'Merge PDF',remove:'Clean image',steps:["Choose a file type","Select an action","Upload and download"],active:'Selected',next:'Now choose an action on the right',start:'Start here',help:'How does it work?'},
 pt:{title:'1. Escolha o tipo de arquivo',actions:'2. O que deseja fazer?',pdf:'PDF',images:'Imagens',office:'Documentos',data:'Excel e dados',ocr:'OCR',archives:'ZIP',intro:'Converta arquivos em dois cliques.',hint:'Primeiro escolha o tipo na roda esquerda e depois a ação na direita.',explore:'Ver ferramentas',featured:'Acessos rápidos',split:'Dividir PDF',merge:'Unir PDF',remove:'Limpar imagem',steps:["Escolha o arquivo","Selecione uma ação","Envie e baixe"],active:'Selecionado',next:'Agora escolha a ação à direita',start:'Comece aqui',help:'Como funciona?'},
 fr:{title:'1. Choisissez le type de fichier',actions:'2. Que voulez-vous faire ?',pdf:'PDF',images:'Images',office:'Documents',data:'Excel et données',ocr:'OCR',archives:'ZIP',intro:'Transformez vos fichiers en deux clics.',hint:"Choisissez d'abord le type à gauche, puis l'action à droite.",explore:'Voir les outils',featured:'Accès rapides',split:'Diviser PDF',merge:'Fusionner PDF',remove:'Nettoyer une image',steps:['Choisissez le type','Sélectionnez une action','Importez et téléchargez'],active:'Sélectionné',next:'Choisissez ensuite une action à droite',start:'Commencez ici',help:'Comment ça marche ?'}
} as const;

const actionNames:Record<Locale,Partial<Record<string,string>>>={
 es:{'split-pdf-by-count':'DIVIDIR PDF','merge-pdf':'UNIR PDF','extract-pdf-pages':'EXTRAER','compress-pdf-lossless':'OPTIMIZAR PDF','rotate-pdf':'GIRAR','pdf-to-word-text':'PDF → WORD TEXTO','image-cleanup':'LIMPIAR IMAGEN','word-to-basic-pdf':'WORD → PDF BÁSICO','create-zip':'CREAR ZIP','extract-zip':'ABRIR ZIP','rename-batch':'RENOMBRAR','inspect-file':'INFO ARCHIVO','batch-images-to-webp':'LOTE WEBP','ocr-pdf-searchable':'PDF BUSCABLE','ocr-image':'OCR IMAGEN','delete-pdf-pages':'QUITAR PÁGINAS'},
 pt:{'split-pdf-by-count':'DIVIDIR PDF','merge-pdf':'JUNTAR PDF','extract-pdf-pages':'EXTRAIR','compress-pdf-lossless':'OTIMIZAR PDF','rotate-pdf':'GIRAR','pdf-to-word-text':'PDF → WORD TEXTO','image-cleanup':'LIMPAR IMAGEM','create-zip':'CRIAR ZIP','extract-zip':'ABRIR ZIP','word-to-basic-pdf':'WORD → PDF BÁSICO'},
 fr:{'split-pdf-by-count':'DIVISER PDF','merge-pdf':'FUSIONNER PDF','extract-pdf-pages':'EXTRAIRE','compress-pdf-lossless':'OPTIMISER PDF','rotate-pdf':'PIVOTER','pdf-to-word-text':'PDF → WORD TEXTE','image-cleanup':'NETTOYER IMAGE','create-zip':'CRÉER ZIP','extract-zip':'OUVRIR ZIP','word-to-basic-pdf':'WORD → PDF SIMPLE'},
 en:{'pdf-to-word-text':'PDF → WORD TEXT','compress-pdf-lossless':'OPTIMIZE PDF','ocr-pdf-searchable':'SEARCHABLE PDF','word-to-basic-pdf':'WORD → BASIC PDF'}
};

const symbols={cut:Scissors,merge:Merge,layers:Layers2,shrink:Minimize2,rotate:RotateCw,file:FileDown,scan:Search} as const;

export default function RadialStudio({locale}:{locale:Locale}){
 const [selected,setSelected]=useState<Section>('pdf');
 const [hasChosen,setHasChosen]=useState(false);
 const [showHelp,setShowHelp]=useState(false);
 const [hovered,setHovered]=useState<string|null>(null);
 const t=words[locale];
 const ring=actions[selected];
 const fallback=ring.find(a=>a.slug===hovered)??ring[0];
 return <section className="radial-studio" aria-label={t.intro}>
  <div className="radial-top"><div><span className="radial-kicker">FILEMAGIK · QUICK STUDIO</span><h2>{t.intro}</h2><p>{t.hint}</p></div><Link href={`/${locale}/tools`} className="radial-all-link">{t.explore}<ArrowUpRight size={16}/></Link></div>
  <div className="radial-guide" aria-label={t.help}>{t.steps.map((step,i)=><div className={'radial-guide-step '+(i===0&&!hasChosen?'guide-current':i===1&&hasChosen?'guide-current':'')} key={step}><strong>{i+1}</strong><span>{step}</span></div>)}<button type="button" className="radial-help-button" aria-expanded={showHelp} onClick={()=>setShowHelp(v=>!v)}>{t.help}</button></div>
  {showHelp&&<p role="status" className="radial-help-text">{t.hint}</p>}
  <div className="radial-wheels">
   <div className={'radial-column '+(!hasChosen?'radial-start-column':'')}><h3><span className="radial-step">01</span>{t.title}<small className="radial-hint-label">{hasChosen?`${t.active}: ${t[selected]}`:t.start}</small></h3>
    <div className="radial-wheel radial-category-wheel" role="group" aria-label={t.title}>
     <div className="wheel-disc"/>
     {sections.map((category,index)=>{
      const Icon=icons[category],angle=index*60-90;
      return <button type="button" className={`radial-sector ${selected===category?'is-active':''}`} key={category} style={{'--angle':`${angle}deg`} as CSSProperties} aria-pressed={selected===category} onClick={()=>{setSelected(category);setHovered(null);setHasChosen(true);}}><Icon size={26}/><span>{t[category]}</span></button>
     })}
     <div className="wheel-center" aria-live="polite"><Files size={22}/><span>{t[selected]}</span></div>
    </div>
   </div>
   <div className="radial-connection"><span/><ArrowUpRight size={28}/><span/><small>{hasChosen?t.next:t.steps[0]}</small></div>
   <div className={'radial-column '+(hasChosen?'radial-action-ready':'')}><h3><span className="radial-step">02</span>{t.actions}</h3>
    <div className="radial-wheel radial-action-wheel" role="group" aria-label={t.actions}>
     <div className="wheel-disc"/>
     {ring.map((action,index)=>{const Icon=symbols[action.icon as keyof typeof symbols]??Stamp;const angle=index*60-90;return <Link href={`/${locale}/${action.slug}`} key={action.slug} onMouseEnter={()=>setHovered(action.slug)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(action.slug)} className={`radial-sector radial-sector-link ${fallback.slug===action.slug?'is-active':''}`} style={{'--angle':`${angle}deg`} as CSSProperties}><Icon size={25}/><span>{actionNames[locale][action.slug]??action.label}</span></Link>})}
     <Link href={`/${locale}/${fallback.slug}`} className="wheel-center wheel-action-center" aria-label={actionNames[locale][fallback.slug]??fallback.label}><ArrowUpRight size={19}/><span>{actionNames[locale][fallback.slug]??fallback.label}</span></Link>
    </div>
   </div>
  </div>
  <div className="radial-shortcuts"><span>{t.featured}</span><Link href={`/${locale}/split-pdf-by-count`}><Scissors size={17}/>{t.split}</Link><Link href={`/${locale}/merge-pdf`}><Merge size={17}/>{t.merge}</Link><Link href={`/${locale}/image-cleanup`}><ImageIcon size={17}/>{t.remove}</Link></div>
 </section>;
}
