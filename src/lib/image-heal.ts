export type Area={x:number;y:number;width:number;height:number};
export function normalizeArea(start:{x:number;y:number},end:{x:number;y:number},width:number,height:number):Area{
 const x=Math.min(width,Math.max(0,Math.floor(Math.min(start.x,end.x))));
 const y=Math.min(height,Math.max(0,Math.floor(Math.min(start.y,end.y))));
 const right=Math.min(width,Math.ceil(Math.max(start.x,end.x)));
 const bottom=Math.min(height,Math.ceil(Math.max(start.y,end.y)));
 return {x,y,width:Math.max(0,right-x),height:Math.max(0,bottom-y)};
}
export function healRectangle(source:ImageData,area:Area):ImageData{
 const {width,height,data}=source;
 const out=new ImageData(new Uint8ClampedArray(data),width,height);
 const x0=Math.max(2,Math.floor(area.x)),y0=Math.max(2,Math.floor(area.y));
 const x1=Math.min(width-2,Math.ceil(area.x+area.width)),y1=Math.min(height-2,Math.ceil(area.y+area.height));
 if(x1-x0<2||y1-y0<2)throw new Error('Select a larger area');
 if((x1-x0)*(y1-y0)>width*height*.3)throw new Error('Select a smaller region for best results');
 const pixel=(x:number,y:number,c:number)=>data[((y*width)+x)*4+c];
 const edgeAverage=(x:number,y:number,c:number)=>{
  let sum=0,weight=0;
  for(let offset=-2;offset<=2;offset++){
   for(const [sampleX,sampleY] of [[x0-2,y+offset],[x1+1,y+offset],[x+offset,y0-2],[x+offset,y1+1]]){
    const sx=Math.max(0,Math.min(width-1,sampleX)),sy=Math.max(0,Math.min(height-1,sampleY));
    const distance=Math.max(1,Math.hypot(x-sx,y-sy));const w=1/(distance*distance);
    sum+=pixel(sx,sy,c)*w;weight+=w;
   }
  }
  return sum/weight;
 };
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const tx=(x-x0+1)/(x1-x0+1),ty=(y-y0+1)/(y1-y0+1);
  const index=(y*width+x)*4;
  for(let c=0;c<3;c++){
   const horizontal=pixel(x0-2,y,c)*(1-tx)+pixel(x1+1,y,c)*tx;
   const vertical=pixel(x,y0-2,c)*(1-ty)+pixel(x,y1+1,c)*ty;
   const edge=edgeAverage(x,y,c);
   const replacement=horizontal*.38+vertical*.38+edge*.24;
   const distance=Math.min(x-x0+1,x1-x,y-y0+1,y1-y);
   const feather=Math.min(1,distance/4);
   out.data[index+c]=data[index+c]*(1-feather)+replacement*feather;
  }
  out.data[index+3]=255;
 }
 return out;
}
/** Controlled local correction brush. Retains full undo/redo via one final image.
 * Deliberately bounded: each dab costs one image pass, no remote API or AI.
 */
export function healBrushStroke(source:ImageData,points:ReadonlyArray<{x:number;y:number}>,radius:number):ImageData{
 if(source.width*source.height>4_000_000)throw new Error('Brush editing is limited to 4 megapixels. Resize this image first.');
 if(!Number.isFinite(radius)||radius<3||radius>32)throw new Error('Brush size must be between 3 and 32 pixels.');
 if(points.length<1||points.length>40)throw new Error('Brush stroke is too long. Try smaller strokes.');
 let result=source;
 const size=Math.round(radius*2);
 for(const point of points){
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new Error('Invalid brush coordinates');
  const x=Math.max(2,Math.min(source.width-size-3,Math.round(point.x-radius)));
  const y=Math.max(2,Math.min(source.height-size-3,Math.round(point.y-radius)));
  if(x>=2&&y>=2&&x+size<source.width-1&&y+size<source.height-1)
   result=healRectangle(result,{x,y,width:size,height:size});
 }
 return result;
}

/** Heal only pixels enclosed by a bounded freehand polygon, leaving all other
 * pixels bit-for-bit unchanged. The local rectangle algorithm supplies the
 * fill estimate; the polygon mask decides what may actually be modified.
 */
export function healPolygon(source:ImageData,points:ReadonlyArray<{x:number;y:number}>):ImageData{
 if(source.width*source.height>4_000_000)throw new Error('Lasso editing is limited to 4 megapixels');
 if(points.length<3||points.length>200)throw new Error('Select a closed region using 3 to 200 points');
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw new Error('Invalid lasso coordinates');
 const left=Math.max(2,Math.floor(Math.min(...points.map(p=>p.x))));
 const top=Math.max(2,Math.floor(Math.min(...points.map(p=>p.y))));
 const right=Math.min(source.width-2,Math.ceil(Math.max(...points.map(p=>p.x))));
 const bottom=Math.min(source.height-2,Math.ceil(Math.max(...points.map(p=>p.y))));
 if(right-left<3||bottom-top<3)throw new Error('Lasso selection too small');
 if((right-left)*(bottom-top)>source.width*source.height*.3)throw new Error('Lasso selection too large');
 const estimated=healRectangle(source,{x:left,y:top,width:right-left,height:bottom-top});
 const mask=document.createElement('canvas');mask.width=source.width;mask.height=source.height;
 const ctx=mask.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas unavailable');
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
 for(const point of points.slice(1))ctx.lineTo(point.x,point.y);
 ctx.closePath();ctx.fill();
 const selected=ctx.getImageData(left,top,right-left,bottom-top).data;
 const result=new ImageData(new Uint8ClampedArray(source.data),source.width,source.height);
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
  const m=((y-top)*(right-left)+(x-left))*4+3;
  if(selected[m]===0)continue;
  const index=(y*source.width+x)*4;
  for(let c=0;c<4;c++)result.data[index+c]=estimated.data[index+c];
 }
 return result;
}
