import type {ToolSlug} from '@/config/site';

const MIB=1024*1024;
const heavy=new Set<ToolSlug>(['ocr-pdf','ocr-image','compress-pdf-raster','pdf-to-png','images-to-pdf','image-cleanup']);
const imageBatch=new Set<ToolSlug>(['batch-images-to-webp']);
const images=new Set<ToolSlug>(['jpg-to-png','jpg-to-webp','png-to-jpg','png-to-webp','webp-to-jpg','webp-to-png','resize-image','adjust-image']);
const archives=new Set<ToolSlug>(['create-zip','extract-zip','create-tar','extract-tar','rename-batch']);
export type FileLimits={perFile:number;total:number;maxFiles:number};
export function limitsFor(slug:ToolSlug):FileLimits{
 if(slug==='server-join-audio'||slug==='server-join-video')return {perFile:3*MIB,total:12*MIB,maxFiles:4};
 if(slug==='server-mixed-batch')return {perFile:3*MIB,total:12*MIB,maxFiles:6};
 if(slug.startsWith('server-'))return {perFile:3*MIB,total:3*MIB,maxFiles:1};
 if(imageBatch.has(slug))return {perFile:40*MIB,total:120*MIB,maxFiles:30};
 if(slug==='replace-pdf-image-native')return {perFile:3*MIB,total:3*MIB,maxFiles:1};
 if(slug==='ocr-pdf-professional')return {perFile:3*MIB,total:3*MIB,maxFiles:1};
 if(slug==='ods-to-pdf'||slug==='odp-to-pdf')return {perFile:3*MIB,total:3*MIB,maxFiles:1};
 if(slug==='heic-to-png')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(slug==='tiff-pages-to-zip')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(slug==='tiff-to-png')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(slug==='gif-frames-to-zip')return {perFile:30*MIB,total:30*MIB,maxFiles:1};
 if(slug==='gif-to-png')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(slug==='markdown-to-docx')return {perFile:3*MIB,total:3*MIB,maxFiles:1};
 if(slug==='avif-to-png')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(slug==='rtf-to-text')return {perFile:5*MIB,total:5*MIB,maxFiles:1};
 if(slug==='epub-to-text')return {perFile:60*MIB,total:60*MIB,maxFiles:1};
 if(slug==='audio-to-wav')return {perFile:30*MIB,total:30*MIB,maxFiles:1};
 if(slug==='srt-to-vtt'||slug==='vtt-to-srt')return {perFile:5*MIB,total:5*MIB,maxFiles:1};
 if(slug==='create-gzip'||slug==='extract-gzip')return {perFile:60*MIB,total:60*MIB,maxFiles:1};
 if(slug==='image-to-bmp')return {perFile:40*MIB,total:40*MIB,maxFiles:1};
 if(archives.has(slug))return {perFile:120*MIB,total:120*MIB,maxFiles:slug==='extract-zip'||slug==='extract-tar'?1:100};
 if(heavy.has(slug))return {perFile:60*MIB,total:120*MIB,maxFiles:slug==='images-to-pdf'?30:1};
 if(images.has(slug))return {perFile:100*MIB,total:100*MIB,maxFiles:1};
 if(slug==='merge-pdf')return {perFile:100*MIB,total:200*MIB,maxFiles:20};
 return {perFile:100*MIB,total:100*MIB,maxFiles:1};
}
export function validateFiles(slug:ToolSlug,files:Pick<File,'size'>[]):void{
 const limits=limitsFor(slug);
 if(!files.length)throw new Error('Select at least one file');
 if(files.length>limits.maxFiles)throw new Error('Too many files: maximum '+limits.maxFiles);
 if(files.some(file=>file.size>limits.perFile))throw new Error('File too large: maximum '+Math.floor(limits.perFile/MIB)+' MB per file for this operation.');
 if(files.reduce((sum,file)=>sum+file.size,0)>limits.total)throw new Error('Total size exceeds '+Math.floor(limits.total/MIB)+' MB for this operation.');
}
export function sizeLimitLabel(slug:ToolSlug):string{
 const max=limitsFor(slug);return `${Math.floor(max.perFile/MIB)} MB / ${Math.floor(max.total/MIB)} MB total`;
}
