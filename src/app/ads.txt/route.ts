import {publisherId} from '@/lib/advertising/adsense';
export function GET(){
 const id=publisherId();
 const text=id?`google.com, ${id.replace('ca-','')}, DIRECT, f08c47fec0942fa0\n`:'';
 return new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}