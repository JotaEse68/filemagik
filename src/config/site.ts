export const locales=['en','es','pt','fr'] as const;
export type Locale=typeof locales[number];
export const defaultLocale:Locale='en';
export const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL??'https://filemagik.example').replace(/\/$/,'');
export const isLocale=(s:string):s is Locale=>locales.includes(s as Locale);
export const tools=[
 {slug:'jpg-to-png',from:'JPG',to:'PNG',kind:'image',accept:'.jpg,.jpeg,image/jpeg'},
 {slug:'webp-to-jpg',from:'WebP',to:'JPG',kind:'image',accept:'.webp,image/webp'},
 {slug:'images-to-pdf',from:'Images',to:'PDF',kind:'pdf',accept:'.jpg,.jpeg,.png,image/jpeg,image/png'},
 {slug:'rotate-pdf',from:'PDF',to:'Rotated PDF',kind:'pdf',accept:'.pdf,application/pdf'},
 {slug:'jpg-to-webp',from:'JPG',to:'WebP',kind:'image',accept:'.jpg,.jpeg,image/jpeg'},
 {slug:'png-to-jpg',from:'PNG',to:'JPG',kind:'image',accept:'.png,image/png'},
 {slug:'png-to-webp',from:'PNG',to:'WebP',kind:'image',accept:'.png,image/png'},
 {slug:'webp-to-png',from:'WebP',to:'PNG',kind:'image',accept:'.webp,image/webp'},
 {slug:'csv-to-json',from:'CSV',to:'JSON',kind:'data',accept:'.csv,text/csv'},
 {slug:'json-to-csv',from:'JSON',to:'CSV',kind:'data',accept:'.json,application/json'},
 {slug:'word-to-text',from:'Word',to:'TXT',kind:'document',accept:'.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
 {slug:'merge-pdf',from:'PDF files',to:'PDF',kind:'pdf',accept:'.pdf,application/pdf'},
 {slug:'split-pdf',from:'PDF',to:'ZIP',kind:'pdf',accept:'.pdf,application/pdf'}
] as const;
export type ToolSlug=typeof tools[number]['slug'];
export const getTool=(slug:string)=>tools.find(t=>t.slug===slug);