export const drawingTools=['freehand','line','arrow','rectangle','ellipse','polyline'];
export const DRAWING_POINTS=512,SCENE_DRAWING_POINTS=4096;
const closeEnough=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7;
export function isClosed(d){return ['rectangle','ellipse'].includes(d.tool)||d.closed;}
export function drawingPath(d){
    const p=d.points;
    if(d.tool==='rectangle'){const [a,b]=p;return [[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]];}
    if(d.tool==='ellipse'){const [a,b]=p,c=[(a[0]+b[0])/2,(a[1]+b[1])/2],r=[Math.abs(b[0]-a[0])/2,Math.abs(b[1]-a[1])/2];return Array.from({length:48},(_,i)=>{const angle=i*Math.PI/24;return [c[0]+Math.cos(angle)*r[0],c[1]+Math.sin(angle)*r[1]];});}
    return p.map(p=>[...p]);
}
function crosses(a,b,c,d){const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const on=(a,b,c)=>Math.abs(orient(a,b,c))<1e-9&&c[0]>=Math.min(a[0],b[0])-1e-9&&c[0]<=Math.max(a[0],b[0])+1e-9&&c[1]>=Math.min(a[1],b[1])-1e-9&&c[1]<=Math.max(a[1],b[1])+1e-9;return orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);}
export function validateDrawing(d){
    if(!d||!drawingTools.includes(d.tool)||typeof d.width!=='number'||!Number.isFinite(d.width)||d.width<.001||d.width>1||typeof d.closed!=='boolean'||typeof d.fill!=='boolean'||typeof d.fillColor!=='string'||!/^#[0-9a-f]{6}$/i.test(d.fillColor))throw Error('Choose a drawing tool, colours and thickness between 0.1 and 100 cm');
    if(!Array.isArray(d.points)||d.points.length<2||d.points.length>DRAWING_POINTS||d.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000)))throw Error('Drawings need 2 to 512 valid points within 1000 metres of their origin');
    if(['line','arrow','rectangle','ellipse'].includes(d.tool)&&d.points.length!==2)throw Error('This drawing tool needs exactly two control points');
    if(['line','arrow'].includes(d.tool)&&(d.closed||d.fill))throw Error('Lines and arrows cannot be closed or filled');
    if(isClosed(d)&&!['rectangle','ellipse'].includes(d.tool)&&d.points.length<3)throw Error('A closed drawing needs at least three points');
    if(['rectangle','ellipse'].includes(d.tool)&&(Math.abs(d.points[0][0]-d.points[1][0])<.001||Math.abs(d.points[0][1]-d.points[1][1])<.001))throw Error('Drag a shape with both width and height');
    const path=drawingPath(d);if(path.some((p,i)=>i&&closeEnough(p,path[i-1]))||!path.some(p=>!closeEnough(p,path[0]))||isClosed(d)&&closeEnough(path[0],path.at(-1)))throw Error('Drawing points must form non-zero segments; omit the repeated closing point');
    if(d.fill){if(!isClosed(d))throw Error('Close the path before enabling Fill');if(path.length>256)throw Error('Simplify a filled drawing to 256 points or fewer');let area=0;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length];area+=a[0]*b[1]-b[0]*a[1];for(let j=i+1;j<path.length;j++){if(j===i+1||i===0&&j===path.length-1)continue;if(crosses(a,b,path[j],path[(j+1)%path.length]))throw Error('Filled paths cannot cross themselves. Use Show Crossing Segments to move/delete points, or Repair & Fill.');}}if(Math.abs(area)<.000001)throw Error('A filled shape needs a non-zero area');}
    return path.length;
}
export function validateDrawings(project){let points=0;for(const n of project.nodes){if(n.kind==='drawing')points+=validateDrawing(n.drawing);else if(n.drawing!==undefined)throw Error('Drawing data belongs only to drawing objects');}if(points>SCENE_DRAWING_POINTS)throw Error('Scene drawing budget exceeded (4096 rendered points). Simplify or remove some drawings.');}
export function simplifyDrawing(points,tolerance,closed=false){
    if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Choose a positive simplify distance');const input=closed?[...points,points[0]]:points;
    const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
    const keep=new Set([0,input.length-1]),stack=[[0,input.length-1]];while(stack.length){const [a,b]=stack.pop();let far=tolerance,index=-1;for(let i=a+1;i<b;i++){const d=distance(input[i],input[a],input[b]);if(d>far){far=d;index=i;}}if(index!==-1){keep.add(index);stack.push([a,index],[index,b]);}}
    const result=[...keep].sort((a,b)=>a-b).map(i=>[...input[i]]);if(closed)result.pop();return result.length>=(closed?3:2)?result:points.map(p=>[...p]);
}

export function drawingCrossings(points,closed=true){
 const result=[],count=closed?points.length:points.length-1;
 for(let i=0;i<count;i++)for(let j=i+2;j<count;j++){if(closed&&i===0&&j===count-1)continue;if(crosses(points[i],points[(i+1)%points.length],points[j],points[(j+1)%points.length]))result.push([i,j]);}
 return result;
}
// Two-opt reversals remove proper crossings while keeping the original point positions.
// Touching/overlapping segments may still need manual editing; never save a failed repair.
export function untangleDrawing(d){
 if(d.points.length>256)throw Error('Simplify to 256 points or fewer before repairing a filled drawing');const next=structuredClone(d);if(!['freehand','polyline'].includes(d.tool))throw Error('Repair is for freehand and polyline paths');next.closed=true;next.fill=true;
 for(let attempt=0;attempt<Math.min(128,next.points.length*2);attempt++){const crossing=drawingCrossings(next.points)[0];if(!crossing){validateDrawing(next);return next;}const [a,b]=crossing;next.points.splice(a+1,b-a,...next.points.slice(a+1,b+1).reverse());}
 throw Error('Some points touch or overlap. Show crossings, then move or delete the highlighted points.');
}
