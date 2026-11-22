import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const dist=fileURLToPath(new URL('../dist/',import.meta.url)), fixtures=new URL('fixtures/',import.meta.url);
const port=Number(process.env.STUDIO3D_PORT||8783);
if(!fs.existsSync(path.join(dist,'js/vendor/realistic-3d/renderer.js'))) throw Error('Run npm run build first.');
const types={'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.txt':'text/plain','.glb':'model/gltf-binary','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((req,res)=>{
  if(req.headers.host!=='127.0.0.1:'+port && req.headers.host!=='localhost:'+port) return res.writeHead(403).end();
  if(!['GET','HEAD'].includes(req.method)) return res.writeHead(405).end();
  let url,name;
  try {url=new URL(req.url,'http://localhost');name=decodeURIComponent(url.pathname);} catch {return res.writeHead(400).end();}
  if(name==='/api/preview-shell.php') {
    res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':JSON.parse(fs.readFileSync(new URL('preview-policy.json',fixtures))),'Cache-Control':'no-store'});
    return res.end(fs.readFileSync(new URL('preview-shell.html',fixtures)));
  }
  if(name==='/api/realistic-3d-asset.php') {
    const files=new Map([['renderer','/js/vendor/realistic-3d/renderer.js'],['amaka','/assets/realistic-3d/amaka.glb'],['tunde','/assets/realistic-3d/tunde.glb']]);
    name=files.get(url.searchParams.get('file'));if(!name)return res.writeHead(404).end();
    res.setHeader('Access-Control-Allow-Origin','*');
  }
  if(name==='/')name='/index.html';
  if(name.includes('\\') || name.includes('\0') || !/^\/(index\.html$|asset-version\.txt$|(?:js|assets|css)\/)/.test(name))return res.writeHead(404).end();
  const file=path.resolve(dist,'.'+name);
  if(!file.startsWith(path.resolve(dist)+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log('Animation Stage 3D: http://127.0.0.1:'+port+'/'));
