import type {ToolSlug} from '@/config/site';
type NamedFile=Pick<File,'name'>;
export function getAvailableTools(files:NamedFile[]):ToolSlug[]{
 if(!files.length)return [];
 const extensions=files.map(file=>file.name.split('.').pop()?.toLowerCase()??'');
 if(extensions.every(ext=>ext==='pdf'))return files.length>1?['merge-pdf']:['split-pdf','rotate-pdf','pdf-to-png','pdf-to-word-text','crop-pdf','annotate-pdf-text','inspect-pdf-form','fill-pdf-form','flatten-pdf-form'];
 if(extensions.every(ext=>['jpg','jpeg','png','webp'].includes(ext))&&files.length>1)return extensions.every(ext=>['jpg','jpeg','png'].includes(ext))?['images-to-pdf','batch-images-to-webp']:['batch-images-to-webp'];
 if(files.length>1)return [];
 const ext=extensions[0];
 switch(ext){
 case 'jpg':case 'jpeg':return ['jpg-to-webp','jpg-to-png','images-to-pdf','resize-image','adjust-image','image-to-bmp'];
 case 'png':return ['png-to-webp','png-to-jpg','images-to-pdf','resize-image','adjust-image'];
 case 'webp':return ['webp-to-png','webp-to-jpg','resize-image','adjust-image'];
 case 'mp3':case 'wav':case 'ogg':case 'm4a':case 'flac':return ['audio-to-wav'];
 case 'srt':return ['srt-to-vtt'];
 case 'vtt':return ['vtt-to-srt'];
 case 'gz':return ['extract-gzip'];
 case 'zip':return ['extract-zip'];
 case 'csv':return ['csv-to-json','csv-to-xlsx'];
 case 'xlsx':return ['xlsx-to-csv'];
 case 'json':return ['json-to-csv'];
 case 'docx':return ['word-to-text','word-to-basic-pdf'];
 default:return [];
 }
}