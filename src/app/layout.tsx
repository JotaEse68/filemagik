import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'FileMagik — Free online file tools',description:'Convert PDF, images, Word and data online in your browser.',robots:{index:true,follow:true}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}