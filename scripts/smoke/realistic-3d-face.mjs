import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.argv.includes('--dist') ? 'dist' : '.');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
    const page = await browser.newPage();
    await page.route('http://faces.test/**', route => {
        const name = new URL(route.request().url()).pathname;
        if (name === '/') return route.fulfill({ contentType:'text/html', body:'<script src="/js/audio-lip-sync.js"></script>' });
        if (!/^\/(js\/audio-lip-sync\.js|js\/vendor\/realistic-3d\/renderer\.js|assets\/realistic-3d\/(amaka|tunde)\.glb)$/.test(name)) return route.abort();
        return route.fulfill({path:path.join(root,name),contentType:name.endsWith('.js')?'application/javascript':'model/gltf-binary'});
    });
    await page.goto('http://faces.test/');
    const { rows, png } = await page.evaluate(async () => {
        const mod = await import('/js/vendor/realistic-3d/renderer.js');
        await mod.preload(['amaka','tunde']);
        const make = (w,h) => Object.assign(document.createElement('canvas'),{width:w,height:h});
        const canvas = make(738,1024), ctx = canvas.getContext('2d',{willReadFrequently:true});
        const names = ['rest','MBP','FV','A','E','O_U','L','blink','gaze','mouthOnly','rest'];
        const sheet = make(names.length*126,4*175), sc=sheet.getContext('2d');
        sc.fillStyle='#eff1ef';sc.fillRect(0,0,sheet.width,sheet.height);
        const rows = [];
        for (const id of ['amaka','tunde']) for (const yaw of [0,55]) {
            const obj={x:0,y:0,width:738,height:1024,realistic3D:{id,yaw}}, frames=[];
            let top,left;
            for (const [i,name] of names.entries()) {
                const rt=window.AudioLipSyncRuntime, channels=rt.visemes[name]||rt.visemes.rest;
                rt.applyRealistic3DSpeech(obj,{}, {channels,viseme:name,strength:1},
                    {eyeMovement:name!=='mouthOnly',blink:['blink','mouthOnly'].includes(name)?1:0,gazeX:['gaze','mouthOnly'].includes(name)?1:0});
                ctx.clearRect(0,0,738,1024);
                if (!mod.draw(ctx,obj)) throw Error('Face render unavailable');
                if (top===undefined) {
                    const data=ctx.getImageData(0,0,738,512).data;
                    const index=data.findIndex((val,k)=>k%4===3 && val>128);
                    if(index<0) throw Error('Character missing');
                    top=Math.floor(index/4/738);
                    const row=ctx.getImageData(0,top+60,738,1).data;
                    const opaque=(_,k)=>k%4===3 && row[k]>128;
                    left=Math.round((row.findIndex(opaque)+row.findLastIndex(opaque))/8)-63;
                }
                const x=i*126,y=rows.length*175;
                sc.drawImage(canvas,left,top,126,146,x,y,126,146);
                sc.fillStyle='#162624';sc.font='12px sans-serif';sc.fillText(id+' '+yaw+' '+name,x+2,y+162);
                frames.push(ctx.getImageData(left,top,126,146).data);
            }
            const diff=(a,b)=>frames[a].reduce((n,v,k)=>n+(Math.abs(v-frames[b][k])>3),0);
            obj.width=184;obj.height=256;
            const small=[];
            for (const cue of ['MBP','A']) {
                AudioLipSyncRuntime.applyRealistic3DSpeech(obj,{}, {channels:AudioLipSyncRuntime.visemes[cue],viseme:cue,strength:1},{});
                ctx.clearRect(0,0,184,256);
                mod.draw(ctx,obj);
                small.push(ctx.getImageData(0,0,184,256).data);
            }
            rows.push({id,yaw,open:diff(1,3),vowel:diff(4,5),blink:diff(0,7),gaze:diff(0,8),eyesOff:diff(0,9),reset:diff(0,10),
                stageSize:small[0].reduce((n,v,k)=>n+(Math.abs(v-small[1][k])>5),0)});
        }
        return {rows,png:sheet.toDataURL()};
    });
    fs.mkdirSync('tmp',{recursive:true});
    fs.writeFileSync('tmp/realistic-3d-faces.png',Buffer.from(png.split(',')[1],'base64'));
    for (const r of rows) {
        console.log(r);
        assert.ok(r.open>50 && r.vowel>25 && r.blink>12 && r.gaze>5 && !r.eyesOff && !r.reset && r.stageSize>10,
            'Face pose did not render distinctly or reset');
    }
} finally { await browser.close(); }
