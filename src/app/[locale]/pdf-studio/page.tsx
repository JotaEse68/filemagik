import Link from 'next/link';
import type {Metadata} from 'next';
import {locales,siteUrl} from '@/config/site';
import {Scissors,Merge,CopyMinus,FileDown,RotateCcw,Stamp,Minimize2,Images,FileType,ArrowRight,Layers,Crop,PencilLine,ListChecks,FilePenLine,LockKeyhole,FileSearch,ShieldCheck,Unlock,FileSpreadsheet,Archive} from 'lucide-react';
import type {Locale} from '@/config/site';
import {socialLocale} from '@/lib/seo';
const content={
 en:{kicker:'FILEMAGIK / PDF STUDIO',title:'PDF tools without the confusion.',subtitle:'Pick what you want to do. Each tool explains the result before you upload.',items:[
 ['split-pdf','Split PDF into individual pages','Get one PDF per page in a ZIP.'],
 ['split-pdf-by-count','Split every N pages','For example: 30 pages into groups of 5.'],
 ['extract-pdf-pages','Extract selected pages','Keep pages 1, 3 and 7–10 together.'],
 ['merge-pdf','Merge several PDFs','Combine documents in your chosen order.'],
 ['delete-pdf-pages','Remove pages','Discard selected pages without changing the original.'],
 ['reorder-pdf-pages','Reorder pages','Preview thumbnails and adjust their order.'],
 ['rotate-pdf','Rotate PDF','Turn all pages clockwise.'],
 ['watermark-pdf','Add watermark','Mark your document with translucent text.'],
 ['compress-pdf-raster','Compress PDF (raster)','Reduce size with loss of editable text.'],
 ['pdf-to-png','PDF to PNG','Download PNG pages in a ZIP.'],
 ['crop-pdf','Crop visible margins','Hide page margins while keeping PDF text selectable.'],
 ['annotate-pdf-text','Add a text note','Place a visible note on each PDF page.'],
 ['inspect-pdf-form','Inspect form fields','Download field names and current values as JSON.'],
 ['fill-pdf-form','Fill PDF form','Complete interactive fields with a JSON object.'],
 ['flatten-pdf-form','Lock form fields','Make completed fields no longer editable.'],
 ['pdf-to-word-text','PDF to Word (text)','Editable text extraction, not layout preservation.'],
 ['pdf-to-word-visual','PDF to Word (visual)','Preserves the page layout and graphics as non-editable images.'],
 ['edit-pdf-visual','Visual PDF editor','Drag and position text, highlights and shapes.']
 ]},
 es:{kicker:'FILEMAGIK / PDF STUDIO',title:'Tus PDF, sin complicaciones.',subtitle:'Elige qué necesitas. Sabrás qué obtienes antes de subir ningún archivo.',items:[
 ['split-pdf','Dividir en páginas individuales','Un PDF por cada página, descargados en ZIP.'],
 ['split-pdf-by-count','Dividir cada N páginas','Ejemplo: 30 páginas en bloques de 5.'],
 ['extract-pdf-pages','Extraer páginas o intervalos','Conserva juntas las páginas 1, 3 y 7–10.'],
 ['merge-pdf','Unir varios PDF','Combina documentos en el orden que elijas.'],
 ['delete-pdf-pages','Eliminar páginas','Quita las que sobren, sin modificar el original.'],
 ['reorder-pdf-pages','Ordenar páginas','Visualiza miniaturas y cambia el orden.'],
 ['rotate-pdf','Girar PDF','Gira las páginas 90° a la derecha.'],
 ['watermark-pdf','Añadir marca de agua','Protege borradores con texto semitransparente.'],
 ['compress-pdf-raster','Comprimir PDF (raster)','Reduce peso, pero pierde texto seleccionable.'],
 ['pdf-to-png','PDF a imágenes PNG','Descarga todas las páginas en un ZIP.'],
 ['crop-pdf','Recortar márgenes visibles','Oculta los márgenes conservando el texto seleccionable.'],
 ['annotate-pdf-text','Añadir una nota al PDF','Escribe una nota visible en cada página.'],
 ['inspect-pdf-form','Ver campos de formulario','Descarga nombres y valores como JSON.'],
 ['fill-pdf-form','Rellenar formulario PDF','Completa campos interactivos mediante JSON.'],
 ['flatten-pdf-form','Fijar formulario PDF','Convierte los campos rellenados en contenido no editable.'],
 ['pdf-to-word-text','PDF a Word (texto)','Texto editable, sin conservar maquetación.'],
 ['pdf-to-word-visual','PDF a Word (visual)','Conserva tablas e imágenes visualmente; no son texto editable.'],
 ['edit-pdf-visual','Editor PDF visual','Coloca texto, resaltados y formas directamente sobre el PDF.']
 ]},
 pt:{kicker:'FILEMAGIK / PDF STUDIO',title:'Seus PDFs, sem complicações.',subtitle:'Escolha a ação e saiba o resultado antes do envio.',items:[
 ['split-pdf','Separar páginas','Um PDF por página em ZIP.'],['split-pdf-by-count','Dividir a cada N páginas','Exemplo: 30 páginas em blocos de 5.'],['extract-pdf-pages','Extrair páginas','Mantenha páginas 1, 3 e 7–10.'],['merge-pdf','Juntar PDFs','Combine arquivos na ordem escolhida.'],['delete-pdf-pages','Remover páginas','Remova páginas sem modificar o original.'],['reorder-pdf-pages','Reorganizar páginas','Visualize e altere a ordem.'],['rotate-pdf','Girar PDF','Gire páginas 90°.'],['watermark-pdf','Marca d’água','Adicione texto translúcido.'],['compress-pdf-raster','Compactar PDF','Menor arquivo, mas sem texto selecionável.'],['pdf-to-png','PDF para PNG','Imagens PNG em ZIP.'],['crop-pdf','Recortar margens','Oculte margens mantendo o texto selecionável.'],['annotate-pdf-text','Anotar PDF','Adicione uma nota visível a cada página.'],['inspect-pdf-form','Ver campos do formulário','Baixe nomes e valores em JSON.'],['fill-pdf-form','Preencher PDF','Preencha campos interativos com JSON.'],['flatten-pdf-form','Fixar formulário','Impeça a edição dos campos preenchidos.'],['pdf-to-word-text','PDF para Word (texto)','Texto editável sem layout.'],['pdf-to-word-visual','PDF para Word (visual)','Mantém o visual das páginas como imagens não editáveis.'],['edit-pdf-visual','Editor PDF visual','Arraste textos e destaques sobre o PDF.']
 ]},
 fr:{kicker:'FILEMAGIK / PDF STUDIO',title:'Vos PDF, en toute simplicité.',subtitle:'Choisissez votre action avant de sélectionner un fichier.',items:[
 ['split-pdf','Séparer chaque page','Un PDF par page dans un ZIP.'],['split-pdf-by-count','Diviser par N pages','Exemple : 30 pages, groupes de 5.'],['extract-pdf-pages','Extraire des pages','Gardez les pages 1, 3 et 7–10.'],['merge-pdf','Fusionner les PDF','Assemblez dans l’ordre choisi.'],['delete-pdf-pages','Supprimer des pages','Supprimez sans modifier l’original.'],['reorder-pdf-pages','Réorganiser les pages','Aperçu et nouvel ordre.'],['rotate-pdf','Pivoter PDF','Tournez les pages de 90°.'],['watermark-pdf','Ajouter un filigrane','Ajoutez un texte translucide.'],['compress-pdf-raster','Compresser PDF','Fichier plus petit, texte non sélectionnable.'],['pdf-to-png','PDF vers PNG','Images PNG dans un ZIP.'],['crop-pdf','Rogner les marges','Masquez les marges en gardant le texte sélectionnable.'],['annotate-pdf-text','Annoter le PDF','Ajoutez une note sur chaque page.'],['inspect-pdf-form','Voir les champs','Téléchargez noms et valeurs en JSON.'],['fill-pdf-form','Remplir un formulaire PDF','Saisissez les valeurs via JSON.'],['flatten-pdf-form','Figer un formulaire','Rendez les champs remplis non modifiables.'],['pdf-to-word-text','PDF vers Word (texte)','Texte éditable sans mise en page.'],['pdf-to-word-visual','PDF vers Word (visuel)','Mise en page préservée sous forme d’images non éditables.'],['edit-pdf-visual','Éditeur PDF visuel','Placez du texte et des surlignages directement sur le PDF.']
 ]}
} as const;
const advanced={
 es:{title:'Nuevas herramientas avanzadas',subtitle:'Operaciones con límites claramente indicados para cuidar tu documento.',items:[['ocr-pdf-searchable','Crear PDF buscable','OCR con texto seleccionable sobre el documento escaneado.'],['compress-pdf-lossless','Optimizar PDF sin rasterizar','Conserva texto y enlaces; solo exporta si pesa menos.'],['protect-pdf','Proteger PDF con contraseña','Cifrado y contraseña para abrir el archivo.'],['unlock-pdf','Desbloquear PDF autorizado','Requiere conocer la contraseña del documento.'],['pdf-to-excel-text','Extraer texto PDF a Excel','Filas y columnas aproximadas; revisa las tablas complejas.']]},
 en:{title:'Advanced PDF tools',subtitle:'Document-safe operations with transparent limitations.',items:[['ocr-pdf-searchable','Make PDF searchable','OCR text layer over scanned pages.'],['compress-pdf-lossless','Optimize without rasterizing','Keeps text and links; only exports if smaller.'],['protect-pdf','Password protect PDF','Encrypt the PDF with an opening password.'],['unlock-pdf','Unlock your PDF','Password required; only authorized documents.'],['pdf-to-excel-text','PDF text to Excel','Approximate rows; complex tables require review.']]},
 pt:{title:'Ferramentas PDF avançadas',subtitle:'Operações com limites claros e sem promessas de fidelidade absoluta.',items:[['ocr-pdf-searchable','PDF pesquisável','Camada OCR selecionável.'],['compress-pdf-lossless','Otimizar sem rasterizar','Mantém texto e links, apenas quando menor.'],['protect-pdf','Proteger PDF','Senha de acesso e criptografia.'],['unlock-pdf','Desbloquear PDF','Requer a senha do documento.'],['pdf-to-excel-text','Texto PDF para Excel','Tabelas complexas requerem revisão.']]},
 fr:{title:'Outils PDF avancés',subtitle:'Des opérations aux limites clairement indiquées.',items:[['ocr-pdf-searchable','PDF consultable','Texte OCR sélectionnable.'],['compress-pdf-lossless','Optimiser sans rastériser','Conserve le texte et les liens, si plus petit.'],['protect-pdf','Protéger un PDF','Mot de passe et chiffrement.'],['unlock-pdf','Déverrouiller un PDF','Mot de passe requis.'],['pdf-to-excel-text','Texte PDF vers Excel','Extraction approximative des lignes.']]}
} as const;
const advancedIcons=[FileSearch,Archive,ShieldCheck,Unlock,FileSpreadsheet];
const icons=[Scissors,Layers,FileDown,Merge,CopyMinus,RotateCcw,RotateCcw,Stamp,Minimize2,Images,Crop,PencilLine,ListChecks,FilePenLine,LockKeyhole,FileType,Images,PencilLine];
export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}):Promise<Metadata>{const {locale}=await params;const t=content[locale]??content.en;return {title:`${t.title} | FileMagik PDF Studio`,description:t.subtitle,robots:{index:true,follow:true},openGraph:{title:`${t.title} | FileMagik PDF Studio`,description:t.subtitle,url:`${siteUrl}/${locale}/pdf-studio`,locale:socialLocale[locale],type:'website'},alternates:{canonical:`${siteUrl}/${locale}/pdf-studio`,languages:Object.fromEntries([...locales.map(l=>[l,`${siteUrl}/${l}/pdf-studio`]),['x-default',`${siteUrl}/en/pdf-studio`]])}};}
export default async function PdfStudioPage({params}:{params:Promise<{locale:Locale}>}){
 const {locale}=await params;const t=content[locale]??content.en;return <main className="pdf-hub"><div className="container"><div className="pdf-hub-hero"><span className="radial-kicker">{t.kicker}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="pdf-hub-grid">{t.items.map(([slug,title,description],i)=>{const Icon=icons[i];return <Link href={`/${locale}/${slug}`} className="pdf-hub-item" key={slug}><span className="pdf-hub-icon"><Icon size={25}/></span><span className="pdf-hub-description"><strong>{title}</strong><small>{description}</small></span><ArrowRight size={19}/></Link>})}</div><section className="pdf-advanced-section"><div className="pdf-advanced-heading"><h2>{advanced[locale].title}</h2><p>{advanced[locale].subtitle}</p></div><div className="pdf-hub-grid">{advanced[locale].items.map(([slug,title,description],index)=>{const Icon=advancedIcons[index];return <Link href={`/${locale}/${slug}`} className="pdf-hub-item" key={slug}><span className="pdf-hub-icon"><Icon size={25}/></span><span className="pdf-hub-description"><strong>{title}</strong><small>{description}</small></span><ArrowRight size={19}/></Link>})}</div></section></div></main>;
}
