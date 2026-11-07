import type {ToolSlug} from '@/config/site';
type NamedFile=Pick<File,'name'>;
export function getAvailableTools(files:NamedFile[]):ToolSlug[]{
 if(!files.length)return [];
 const extensions=files.map(file=>file.name.split('.').pop()?.toLowerCase()??'');
 if(extensions.every(ext=>ext==='pdf'))return files.length>1?['merge-pdf']:['split-pdf','rotate-pdf','pdf-to-png','pdf-to-word-text'];
 if(extensions.every(ext=>['jpg','jpeg','png'].includes(ext))&&files.length>1)return ['images-to-pdf'];
 if(files.length>1)return [];
 const ext=extensions[0];
 switch(ext){
 case 'jpg':case 'jpeg':return ['jpg-to-webp','jpg-to-png','images-to-pdf'];
 case 'png':return ['png-to-webp','png-to-jpg','images-to-pdf'];
 case 'webp':return ['webp-to-png','webp-to-jpg'];
 case 'csv':return ['csv-to-json'];
 case 'json':return ['json-to-csv'];
 case 'docx':return ['word-to-text','word-to-basic-pdf'];
 default:return [];
 }
}