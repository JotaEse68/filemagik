import type {OutputFile} from './convert';

const MAX_BYTES=3*1024*1024,MAX_LINES=30000;
type Block={type:'heading'|'paragraph'|'bullet'|'number'|'quote'|'code';text:string;level?:number};
export function markdownBlocks(input:string):Block[]{
 const lines=input.replace(/\r\n?/g,'\n').split('\n');
 if(lines.length>MAX_LINES)throw new Error('Markdown has too many lines');
 const blocks:Block[]=[];let code=false,buffer:string[]=[];
 const flush=()=>{if(buffer.length){blocks.push({type:code?'code':'paragraph',text:buffer.join(code?'\n':' ').trim()});buffer=[];}};
 for(const line of lines){
  if(/^\s*```/.test(line)){flush();code=!code;continue;}
  if(code){buffer.push(line);continue;}
  if(!line.trim()){flush();continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)$/);
  if(heading){flush();blocks.push({type:'heading',level:heading[1].length,text:heading[2].trim()});continue;}
  const bullet=line.match(/^\s{0,3}[-*+]\s+(.+)$/);
  if(bullet){flush();blocks.push({type:'bullet',text:bullet[1]});continue;}
  const number=line.match(/^\s{0,3}\d+[.)]\s+(.+)$/);
  if(number){flush();blocks.push({type:'number',text:number[1]});continue;}
  const quote=line.match(/^>\s?(.+)$/);
  if(quote){flush();blocks.push({type:'quote',text:quote[1]});continue;}
  buffer.push(line.trim());
 }
 flush();
 if(!blocks.length)throw new Error('Markdown contains no readable text');
 return blocks;
}
/** Editable DOCX: headings, paragraphs, lists, quotes and fenced code; no HTML execution or external asset fetching. */
export async function markdownToDocx(file:File):Promise<OutputFile>{
 if(file.size===0||file.size>MAX_BYTES)throw new Error('Markdown input exceeds the 3 MB limit');
 const input=await file.text();
 const blocks=markdownBlocks(input);
 const {Document,Packer,Paragraph,TextRun,HeadingLevel}=await import('docx');
 const levels=[HeadingLevel.HEADING_1,HeadingLevel.HEADING_2,HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,HeadingLevel.HEADING_5,HeadingLevel.HEADING_6];
 const paragraphs=blocks.map(block=>{
  const text=block.text.slice(0,100000);
  if(block.type==='heading')return new Paragraph({text,heading:levels[(block.level||1)-1]});
  if(block.type==='bullet')return new Paragraph({text,bullet:{level:0}});
  if(block.type==='number')return new Paragraph({text,numbering:{reference:'numbered',level:0}});
  if(block.type==='quote')return new Paragraph({children:[new TextRun({text,italics:true})],indent:{left:650}});
  if(block.type==='code')return new Paragraph({children:[new TextRun({text,font:'Consolas'})]});
  return new Paragraph({text});
 });
 const doc=new Document({numbering:{config:[{reference:'numbered',levels:[{
  level:0,format:'decimal',text:'%1.',alignment:'start',style:{paragraph:{indent:{left:720,hanging:260}}}
 }]}]},sections:[{children:paragraphs}]});
 const content=await Packer.toBlob(doc);
 return {name:file.name.replace(/\.(md|markdown)$/i,'')+'.docx',blob:content};
}
