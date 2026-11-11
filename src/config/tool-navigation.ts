import {tools,type ToolSlug,type Locale} from './site';

export const categoryIds=['all','pdf','images','office','data','ocr','archives','subtitles','audio','video'] as const;
export type ToolCategory=typeof categoryIds[number];
type Category=Exclude<ToolCategory,'all'>;
export const categoryLabels:Record<Locale,Record<ToolCategory,string>>={
 en:{all:'All tools',pdf:'PDF Studio',images:'Images',office:'Office & documents',data:'Excel & data',ocr:'OCR & cleanup',archives:'ZIP & archives',subtitles:'Subtitles',audio:'Audio',video:'Video'},
 es:{all:'Todas',pdf:'PDF Studio',images:'Imágenes',office:'Documentos y Office',data:'Excel y datos',ocr:'OCR y limpieza',archives:'ZIP y archivos',subtitles:'Subtítulos',audio:'Audio',video:'Vídeo'},
 pt:{all:'Todas',pdf:'PDF Studio',images:'Imagens',office:'Documentos e Office',data:'Excel e dados',ocr:'OCR e limpeza',archives:'ZIP e arquivos',subtitles:'Legendas',audio:'Áudio',video:'Vídeo'},
 fr:{all:'Tous les outils',pdf:'PDF Studio',images:'Images',office:'Documents et Office',data:'Excel et données',ocr:'OCR et nettoyage',archives:'ZIP et archives',subtitles:'Sous-titres',audio:'Audio',video:'Vidéo'}
};
const overrides:Partial<Record<ToolSlug,Category>>={
 'inspect-pdf-form':'pdf','fill-pdf-form':'pdf','flatten-pdf-form':'pdf',
 'crop-pdf':'pdf','annotate-pdf-text':'pdf',
 'audio-to-wav':'audio',
 'srt-to-vtt':'subtitles','vtt-to-srt':'subtitles',
 'create-gzip':'archives','extract-gzip':'archives',
 'inspect-file':'archives','rename-batch':'archives',
 'create-zip':'archives','extract-zip':'archives',
 'image-cleanup':'ocr','ocr-image':'ocr','ocr-pdf':'ocr',
 'word-to-basic-pdf':'office','word-to-text':'office','pdf-to-word-text':'office',
 'xlsx-to-csv':'data','csv-to-xlsx':'data','csv-to-json':'data','json-to-csv':'data',
 'image-to-bmp':'images',
 'batch-images-to-webp':'images','adjust-image':'images',
 'images-to-pdf':'images','jpg-to-webp':'images','jpg-to-png':'images','webp-to-jpg':'images',
 'png-to-jpg':'images','png-to-webp':'images','webp-to-png':'images'
};
export function categoryOf(slug:ToolSlug):Category{
 if(overrides[slug])return overrides[slug];
 const kind=tools.find(tool=>tool.slug===slug)?.kind;
 switch(kind){
  case 'image':return 'images';
  case 'video':return 'video';
  case 'audio':return 'audio';
  case 'archive':return 'archives';
  case 'subtitle':return 'subtitles';
  case 'data':return 'data';
  case 'document':return 'office';
  case 'utility':return 'archives';
  default:return 'pdf';
 }
}
export const categorizedTools=tools.map(tool=>({...tool,category:categoryOf(tool.slug)}));
export function searchTools(query:string,category:ToolCategory='all'){
 const needle=query.trim().toLocaleLowerCase();
 return categorizedTools.filter(tool=>
  (category==='all'||tool.category===category)&&
  (!needle||[tool.slug,tool.from,tool.to,tool.category].some(value=>value.toLocaleLowerCase().includes(needle)))
 );
}
export const categoryCounts=Object.fromEntries(categoryIds.map(category=>[category,searchTools('',category).length])) as Record<ToolCategory,number>;
