// Install before navigation so local and hosted acceptance count the same thing.
export async function installWebGLCounter(page){
 await page.addInitScript(()=>{
  window.contexts=0;
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
   if(type==='webgl2')window.contexts++;
   return original.call(this,type,...args);
  };
 });
}
