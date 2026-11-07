import type {ToolSlug} from '@/config/site';

const MIB=1024*1024;
const heavy=new Set<ToolSlug>(['ocr-pdf','ocr-image','compress-pdf-raster','pdf-to-png','images-to-pdf','image-cleanup']);
const imageBatch=new Set<ToolSlug>(['batch-images-to-webp']);
const images=new Set<ToolSlug>(['jpg-to-png','jpg-to-webp','png-to-jpg','png-to-webp','webp-to-jpg','webp-to-png','resize-image','adjust-image']);
const archives=new Set<ToolSlug>(['create-zip','extract-zip','rename-batch']);
export type FileLimits={perFile:number;total:number;maxFiles:number};
export function limitsFor(slug:ToolSlug):FileLimits{
 if(imageBatch.has(slug))return {perFile:40*MIB,total:120*MIB,maxFiles:30};
 if(archives.has(slug))return {perFile:120*MIB,total:120*MIB,maxFiles:slug==='extract-zip'?1:100};
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
