import '../globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={robots:{index:false,follow:false},title:'FileMagik Admin'};
export default function AdminLayout({children}:{children:React.ReactNode}){return <html lang="es"><body style={{margin:0,background:'#0c1220',color:'#f0f4ff',fontFamily:'system-ui, sans-serif'}}>{children}</body></html>}