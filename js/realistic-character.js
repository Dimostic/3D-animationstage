/* Photographic parts share the SVG armature's joints, contacts and facial runtime. */
(function (global) {
    'use strict';
    const views = ['front', 'side-right', 'side-left', 'back', 'front-3q-right', 'front-3q-left', 'back-3q-right', 'back-3q-left'];
    const roles = ['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'];
    const labels = { torso: 'Torso / clothing', 'head-neck': 'Head / neck', 'right-arm': 'Right arm', 'left-arm': 'Left arm', 'right-leg': 'Right leg', 'left-leg': 'Left leg' };
    const clone = value => JSON.parse(JSON.stringify(value));
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n)));
    const finite = (n, lo, hi, fallback) => Number.isFinite(Number(n)) ? clamp(n, lo, hi) : fallback;
    const point = p => ({ x: finite(p?.x, 0, 1, .5), y: finite(p?.y, 0, 1, .5) });
    const png = s => typeof s === 'string' && s.length < 8e6 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '';
    const box = b => ({ x: finite(b?.x, 0, .99, .4), y: finite(b?.y, 0, .99, .1), w: finite(b?.w, .002, 1, .05), h: finite(b?.h, .002, 1, .015) });
    const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) });
    const bounds = poly => { const xs = poly.map(p => p.x), ys = poly.map(p => p.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
    const faceShape = value => Object.fromEntries(['breadth','jaw','eyes','mouth'].map(k=>[k,finite(value?.[k],-.08,.08,0)]));
    function normalize(value) {
        if (!value || value.version !== 1 || !value.views || JSON.stringify(value).length > 32e6) return null;
        const out = { version: 1, name: String(value.name || 'Realistic character').slice(0, 80), revision: String(value.revision || '1').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64), views: {},
            mode: value.mode === 'hybrid' ? 'hybrid' : 'photographic',
            hybrid: { preset: String(value.hybrid?.preset || 'corporate-woman-premium').slice(0,80), skin: /^#[a-f0-9]{6}$/i.test(value.hybrid?.skin || '') ? value.hybrid.skin : '#a87755', headWidth: finite(value.hybrid?.headWidth,.65,1.2,1), headY: finite(value.hybrid?.headY,-12,12,0), neckWidth: finite(value.hybrid?.neckWidth,.16,.4,.26), hands:Object.fromEntries(['right','left'].map(side=>[side,['rest','open','point','grip'].includes(value.hybrid?.hands?.[side])?value.hybrid.hands[side]:'rest'])) },
            widthScale: finite(value.widthScale, .8, 1.2, 1), heightScale: finite(value.heightScale, .8, 1.2, 1), headScale: finite(value.headScale, .65, 1.15, 1), neckLift: finite(value.neckLift,0,.2,.05),
            provenance: { kind: ['reference', 'uploaded', 'generated'].includes(value.provenance?.kind) ? value.provenance.kind : 'uploaded', consentId: String(value.provenance?.consentId || '').slice(0, 80), sourceName: String(value.provenance?.sourceName || '').slice(0, 100) } };
        const body = bodySettings(value.hybrid?.body);
        if(value.modules?.version===1) out.modules={version:1,body:String(value.modules.body||'').slice(0,60),head:String(value.modules.head||'').slice(0,60),build:['slim','standard','broad'].includes(value.modules.build)?value.modules.build:'standard',outfit:['original','teal','burgundy'].includes(value.modules.outfit)?value.modules.outfit:'original',headFit:finite(value.modules.headFit,.9,1.1,1),turns:value.modules.turns===true};
        if(out.modules && out.mode==='hybrid')out.modules.turns=false;
        if (body?.preset === out.hybrid.preset) out.hybrid.body = body;
        for (const view of views) {
            const source = value.views[view];
            if (!source || !png(source.source)) continue;
            const v = { source: source.source, original: png(source.original),
                faceShape: faceShape(source.faceShape),
                consentId: /^pc_[a-f0-9]{32}$/.test(source.consentId || '') ? source.consentId : '',
                sha256: /^[a-f0-9]{64}$/.test(source.sha256 || '') ? source.sha256 : '',
                width: finite(source.width, 32, 2048, 800), height: finite(source.height, 32, 2048, 1200), parts: {}, face: {}, mirrored: !!source.mirrored };
            if (/^ri_[a-f0-9]{32}$/.test(source.generation?.jobId || '')) v.generation = { jobId: source.generation.jobId, operation: String(source.generation.operation || '').slice(0,20), reviewed: source.generation.reviewed === true };
            if (/^[a-f0-9]{64}$/.test(source.qualityReview?.fingerprint || '')) v.qualityReview = { fingerprint: source.qualityReview.fingerprint, reviewedAt: String(source.qualityReview.reviewedAt || '').slice(0,30) };
            for (const role of roles) {
                const p = source.parts?.[role];
                if (!p || !Array.isArray(p.polygon) || p.polygon.length < 3 || p.polygon.length > 128) break;
                const polygon = p.polygon.map(point), b = bounds(polygon);
                if (b.w < .005 || b.h < .005) break;
                v.parts[role] = { polygon, pivot: point(p.pivot), bend: finite(p.bend, .1, .9, .5), end: finite(p.end, .4, .99, .88),
                    tint: /^#[a-f0-9]{6}$/i.test(p.tint || '') ? p.tint : '', tintStrength: finite(p.tintStrength, 0, .75, 0),
                    texture: png(p.texture), faceTexture: png(p.faceTexture), features: {} };
                if (png(p.sourceImage)) v.parts[role].sourceImage = p.sourceImage;
                if (role !== 'head-neck' && png(p.replacement) && /^pc_[a-f0-9]{32}$/.test(p.replacementConsent || '')) {
                    v.parts[role].replacement = p.replacement; v.parts[role].replacementConsent = p.replacementConsent;
                }
                for (const key of ['eyeLeft', 'eyeRight', 'upperLip', 'lowerLip']) {
                    const f = p.features?.[key];
                    if (f && png(f.image)) v.parts[role].features[key] = { ...box(f), image: f.image };
                }
            }
            if (Object.keys(v.parts).length !== roles.length) continue;
            v.layers=(Array.isArray(source.layers)?source.layers:[]).slice(0,16).filter(layer=>roles.includes(layer?.role)&&layer.role!=='head-neck'&&Array.isArray(layer.polygon)&&layer.polygon.length>=3&&layer.polygon.length<=128).map((layer,index)=>({
                id:String(layer.id||`layer-${index}`).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60)||`layer-${index}`,name:String(layer.name||'Clothing region').slice(0,80),role:layer.role,polygon:layer.polygon.map(point),visible:layer.visible!==false,
                tint:/^#[a-f0-9]{6}$/i.test(layer.tint||'')?layer.tint:'#ffffff',tintStrength:finite(layer.tintStrength,0,.75,0),texture:png(layer.texture),
                ...(layer.kind?{kind:layer.kind==='repair'?'repair':'garment'}:{}),
                ...(layer.extract!==undefined?{extract:layer.kind!=='repair'&&layer.extract===true}:{}),
                ...(layer.sourceRect?{sourceRect:box(layer.sourceRect)}:{}),
                ...(layer.edgeSoftness!==undefined?{edgeSoftness:finite(layer.edgeSoftness,0,.15,0)}:{})
            }));
            for (const key of ['eyeLeft', 'eyeRight', 'mouth']) v.face[key] = box(source.face?.[key]);
            out.views[view] = v;
        }
        return Object.keys(out.views).length ? out : null;
    }
    async function image(src) {
        const img = new Image(); img.src = src;
        await img.decode();
        if (img.naturalWidth * img.naturalHeight > 12e6) throw new Error('Image is too large. Use a photograph below 12 megapixels.');
        return img;
    }
    function defaults(width, height, view = 'front') {
        const rect = (x, y, w, h, px, py) => ({ polygon: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], pivot: { x: px, y: py }, bend: .48, end: .86, tint: '', tintStrength: 0 });
        const side = view.startsWith('side');
        return { width, height, source: '', parts: {
            torso: rect(.27, .19, .46, .43, .5, .28), 'head-neck': rect(.25, .015, .5, .23, .5, .23),
            'right-arm': rect(side ? .43 : .10, .23, .23, .40, side ? .52 : .28, .25),
            'left-arm': rect(side ? .47 : .67, .23, .23, .40, side ? .56 : .72, .25),
            'right-leg': rect(.28, .56, .23, .43, .4, .58), 'left-leg': rect(.50, .56, .23, .43, .61, .58)
        }, face: { eyeLeft: box({ x: .39, y: .093, w: .065, h: .015 }), eyeRight: box({ x: .54, y: .093, w: .065, h: .015 }), mouth: box({ x: .45, y: .136, w: .10, h: .021 }) } };
    }
    function crop(source, b) {
        const out = canvas(b.w * source.width, b.h * source.height);
        out.getContext('2d').drawImage(source, b.x * source.width, b.y * source.height, b.w * source.width, b.h * source.height, 0, 0, out.width, out.height);
        return out;
    }
    function orderedLayers(view) {
        return [...(view.layers || [])].sort((a,b)=>(a.kind==='repair'?0:1)-(b.kind==='repair'?0:1));
    }
    function layerCanvas(src, layer) {
        const b=bounds(layer.polygon), out=canvas(b.w*src.width,b.h*src.height), ctx=out.getContext('2d');
        const sample=layer.kind==='repair'&&layer.sourceRect?layer.sourceRect:b;
        if(sample.w<=0||sample.h<=0||b.w<=0||b.h<=0)return out;
        ctx.drawImage(src,sample.x*src.width,sample.y*src.height,sample.w*src.width,sample.h*src.height,0,0,out.width,out.height);
        ctx.globalCompositeOperation='destination-in';ctx.beginPath();
        layer.polygon.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x-b.x)/b.w*out.width,(p.y-b.y)/b.h*out.height));ctx.closePath();
        ctx.filter=`blur(${Math.min(out.width,out.height)*(layer.edgeSoftness||0)}px)`;ctx.fill();
        return out;
    }
    function reshapeHead(source, view, viewKey) {
        const b=bounds(view.parts['head-neck'].polygon), settings=faceShape(view.faceShape);
        const local=f=>({x:(f.x-b.x)/b.w,y:(f.y-b.y)/b.h,w:f.w/b.w,h:f.h/b.h});
        const mouth=local(view.face.mouth), neck=clamp((view.parts['head-neck'].pivot.y-b.y)/b.h,0,1);
        const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
        const regions=[{x:.5,y:neck*.45,rx:.5,ry:Math.max(.02,neck*.55),amount:settings.breadth},
            {x:.5,y:Math.min(neck-.12,mouth.y+.09),rx:.48,ry:.22,amount:settings.jaw}];
        if(!viewKey.startsWith('back')) {
            for(const name of viewKey.startsWith('side')?['eyeLeft']:['eyeLeft','eyeRight']) {
                const f=local(view.face[name]);regions.push({x:f.x+f.w/2,y:f.y+f.h/2,rx:Math.max(.08,f.w*1.3),ry:Math.max(.05,f.h*2),amount:settings.eyes,vertical:true});
            }
            regions.push({x:mouth.x+mouth.w/2,y:mouth.y+mouth.h/2,rx:Math.max(.1,mouth.w*1.25),ry:Math.max(.08,mouth.h*2.5),amount:settings.mouth});
        }
        const map=(x,y)=>{
            let dx=0,dy=0;
            for(const r of regions){const q=((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2,w=q<1?(1-q)**2:0;dx+=(x-r.x)*r.amount*w;if(r.vertical)dy+=(y-r.y)*r.amount*w;}
            const lock=smooth((neck-y)/.12)*smooth(x/.06)*smooth((1-x)/.06)*smooth(y/.04);
            return {x:x+dx*lock,y:y+dy*lock};
        };
        const out=canvas(source.width,source.height),ctx=out.getContext('2d'),pixels=source.getContext('2d').getImageData(0,0,source.width,source.height),dst=ctx.createImageData(out.width,out.height),w=out.width,h=out.height;
        // Invert the bounded smooth warp; premultiplied sampling preserves transparent edges.
        for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
            const tx=(x+.5)/w,ty=(y+.5)/h;let sx=tx,sy=ty;
            for(let n=0;n<6;n++){const p=map(sx,sy);sx+=tx-p.x;sy+=ty-p.y;}
            const px=clamp(sx*w-.5,0,w-1),py=clamp(sy*h-.5,0,h-1),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy,index=(y*w+x)*4;
            let alpha=0;const rgb=[0,0,0];
            for(const [xx,yy,weight]of [[ix,iy,(1-fx)*(1-fy)],[Math.min(ix+1,w-1),iy,fx*(1-fy)],[ix,Math.min(iy+1,h-1),(1-fx)*fy],[Math.min(ix+1,w-1),Math.min(iy+1,h-1),fx*fy]]) {
                const i=(yy*w+xx)*4,a=pixels.data[i+3]*weight;alpha+=a;for(let c=0;c<3;c++)rgb[c]+=pixels.data[i+c]*a;
            }
            dst.data[index+3]=alpha;for(let c=0;c<3;c++)dst.data[index+c]=alpha?rgb[c]/alpha:0;
        }
        ctx.putImageData(dst,0,0);
        const face=Object.fromEntries(Object.entries(view.face).map(([key,f])=>{
            const a=local(f),points=[];for(let i=0;i<=8;i++){const t=i/8;points.push(map(a.x+a.w*t,a.y),map(a.x+a.w*t,a.y+a.h),map(a.x,a.y+a.h*t),map(a.x+a.w,a.y+a.h*t));}
            const r=bounds(points);return [key,{x:b.x+r.x*b.w,y:b.y+r.y*b.h,w:r.w*b.w,h:r.h*b.h}];
        }));
        return {canvas:out,face,map};
    }
    async function compile(view, viewKey) {
        const invalid=geometryIssues(view,viewKey).filter(issue=>issue.severity==='error');
        if (invalid.length) throw new Error(invalid.map(issue=>issue.message).join(' '));
        for (const role of roles) {
            const p = view.parts?.[role], b = p?.polygon?.length >= 3 ? bounds(p.polygon) : null;
            if (!b || b.w < .005 || b.h < .005 || b.x < 0 || b.y < 0 || b.x + b.w > 1.001 || b.y + b.h > 1.001) throw new Error(`Adjust the ${labels[role]} outline before preparing ${viewKey}.`);
        }
        if (!viewKey.startsWith('back')) {
            const b = bounds(view.parts['head-neck'].polygon);
            for (const key of ['mouth','eyeLeft', ...(viewKey.startsWith('side') ? [] : ['eyeRight'])]) {
                const f = view.face?.[key];
                if (!f || f.w < .002 || f.h < .002 || f.x < b.x || f.y < b.y || f.x + f.w > b.x + b.w || f.y + f.h > b.y + b.h) throw new Error(`Fit the ${key} region inside the head outline for ${viewKey}.`);
            }
        }
        const img = await image(view.source), src = canvas(view.width, view.height);
        src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
        for(const layer of view.layers || []) {
            layer.texture=layerCanvas(src,layer).toDataURL('image/png');
        }
        for (const role of roles) {
            const part = view.parts[role], b = bounds(part.polygon);
            // Independent artwork must never be recut from the assembled preview.
            let partSrc = part.sourceImage ? canvas(src.width,src.height) : src;
            if(part.sourceImage) partSrc.getContext('2d').drawImage(await image(part.sourceImage),b.x*src.width,b.y*src.height,b.w*src.width,b.h*src.height);
            let face=view.face;
            if(role==='head-neck' && Object.values(faceShape(view.faceShape)).some(Boolean)) {
                const shaped=reshapeHead(crop(partSrc,b),view,viewKey);
                const composite=canvas(src.width,src.height);
                composite.getContext('2d').drawImage(shaped.canvas,b.x*src.width,b.y*src.height,b.w*src.width,b.h*src.height);
                partSrc=composite;face=shaped.face;
            }
            const out = crop(partSrc, b), ctx = out.getContext('2d');
            ctx.globalCompositeOperation = 'destination-in'; ctx.beginPath();
            part.polygon.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo']((p.x - b.x) / b.w * out.width, (p.y - b.y) / b.h * out.height));
            ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
            if (role !== 'head-neck' && part.replacement && /^pc_[a-f0-9]{32}$/.test(part.replacementConsent || '')) {
                ctx.clearRect(0,0,out.width,out.height);ctx.drawImage(await image(part.replacement),0,0,out.width,out.height);
            }
            for(const layer of view.layers || [])if(layer.role===role&&layer.kind!=='repair'&&layer.extract) {
                ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();
                layer.polygon.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x-b.x)/b.w*out.width,(p.y-b.y)/b.h*out.height));ctx.closePath();ctx.fill();ctx.restore();
            }
            part.texture = out.toDataURL('image/png'); part.features = {}; part.faceTexture = '';
            if (role !== 'head-neck' || viewKey.startsWith('back')) continue;
            const boxes = { eyeLeft: face.eyeLeft, eyeRight: face.eyeRight,
                upperLip: { ...face.mouth, h: face.mouth.h / 2 }, lowerLip: { ...face.mouth, y: face.mouth.y + face.mouth.h / 2, h: face.mouth.h / 2 } };
            for (const [key, f] of Object.entries(boxes)) {
                const piece = crop(partSrc, f);
                part.features[key] = { x: (f.x - b.x) / b.w, y: (f.y - b.y) / b.h, w: f.w / b.w, h: f.h / b.h, image: piece.toDataURL('image/png') };
            }
            // Borrow adjacent skin only inside feature regions; retain the untouched head for rest.
            for (const f of [face.mouth, face.eyeLeft, ...(viewKey.startsWith('side') ? [] : [face.eyeRight])]) {
                const x = (f.x - b.x) * src.width, y = (f.y - b.y) * src.height, w = f.w * src.width, h = f.h * src.height;
                ctx.save(); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w * .58, h * .8, 0, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(partSrc, f.x * src.width, Math.max(0, (f.y - f.h) * src.height), w, h, x - 1, y - h * .3, w + 2, h * 1.6);
                ctx.restore();
            }
            part.faceTexture = out.toDataURL('image/png');
        }
        return view;
    }
    const roleFor = (key, view) => {
        if (!view.startsWith('side') || !/^(front|back)-(arm|leg)$/.test(key)) return key;
        const near = view.endsWith('right') ? 'right' : 'left', far = near === 'right' ? 'left' : 'right';
        return key.replace(/^(front|back)/, role => role === 'front' ? near : far);
    };
    function fitLandmarks(view, result, viewKey) {
        const pose = result.pose, face = result.faces[0], safe = p => point(p);
        const region = (indices, padX = .002, padY = .002) => {
            const b = bounds(indices.map(i => safe(face[i])));
            return { x: Math.max(0, b.x - padX), y: Math.max(0, b.y - padY), w: b.w + padX * 2, h: b.h + padY * 2 };
        };
        view.face.eyeLeft = region([33,133,159,145]); view.face.eyeRight = region([362,263,386,374]); view.face.mouth = region([61,291,0,17]);
        if (view.face.eyeLeft.x > view.face.eyeRight.x) [view.face.eyeLeft,view.face.eyeRight] = [view.face.eyeRight,view.face.eyeLeft];
        const faceBounds = bounds(face.map(safe)), head = view.parts['head-neck'];
        const left = Math.max(0, faceBounds.x - faceBounds.w * .25), right = Math.min(1, faceBounds.x + faceBounds.w * 1.25);
        const top = Math.max(0, faceBounds.y - faceBounds.h * .45), bottom = Math.min(1, faceBounds.y + faceBounds.h * 1.2);
        head.polygon = [{ x:left,y:top },{ x:right,y:top },{ x:right,y:bottom },{ x:left,y:bottom }]; head.pivot = { x:(left+right)/2,y:bottom-faceBounds.h*.12 };
        const side = viewKey.startsWith('side');
        const shoulder = [safe(pose[12]),safe(pose[11])], hip = [safe(pose[24]),safe(pose[23])];
        if (shoulder[0].x > shoulder[1].x) { shoulder.reverse(); hip.reverse(); }
        const torso = view.parts.torso;
        torso.polygon = [{x:shoulder[0].x,y:shoulder[0].y-.02},{x:shoulder[1].x,y:shoulder[1].y-.02},{x:hip[1].x+.035,y:hip[1].y+.025},{x:hip[0].x-.035,y:hip[0].y+.025}].map(safe);
        torso.pivot = {x:(shoulder[0].x+shoulder[1].x)/2,y:(shoulder[0].y+shoulder[1].y)/2};
        if (side) {
            // Profile shoulders overlap in the photo. Use head width as a
            // conservative torso-depth estimate; hidden limbs keep their fitting.
            const half = Math.max(faceBounds.w * .65, Math.abs(shoulder[1].x-shoulder[0].x)/2);
            const x = torso.pivot.x, hipX = (hip[0].x+hip[1].x)/2, y = (hip[0].y+hip[1].y)/2;
            torso.polygon = [{x:x-half,y:torso.pivot.y-.02},{x:x+half,y:torso.pivot.y-.02},
                {x:hipX+half,y:y+.025},{x:hipX-half,y:y+.025}].map(safe);
        }
        for (const [role, a, b, c] of [['right-arm',12,14,16],['left-arm',11,13,15],['right-leg',24,26,28],['left-leg',23,25,27]]) {
            if ([a,b,c].some(i => !pose[i] || pose[i].visibility < .35)) continue;
            const start=safe(pose[a]), bend=safe(pose[b]), end=safe(pose[c]), width=(side?faceBounds.w*1.2:Math.abs(shoulder[1].x-shoulder[0].x))*(role.includes('arm')?.22:.3);
            if (end.y <= start.y + .05) continue;
            const ymin=Math.max(0,start.y-.015), ymax=Math.min(1,end.y+(role.includes('arm')?.06:.045));
            const p=view.parts[role]; p.polygon=[{x:start.x-width,y:ymin},{x:start.x+width,y:ymin},{x:end.x+width,y:ymax},{x:end.x-width,y:ymax}].map(safe); p.pivot=start;
            p.bend=clamp((bend.y-ymin)/(ymax-ymin),.1,.9); p.end=clamp((end.y-ymin)/(ymax-ymin),.4,.99);
        }
    }
    async function doctorLayout(source) {
        const full = canvas(source.width,source.height); full.getContext('2d').drawImage(await image(source.source),0,0,full.width,full.height);
        const original = canvas(source.width,source.height); original.getContext('2d').drawImage(await image(source.original || source.source),0,0,original.width,original.height);
        const definitions = {
            front: { crop:[100,20,450,1320], face:[[286,116,35,17],[341,116,33,17],[307,165,45,19]], parts:{
                'head-neck': [[[263,91],[280,46],[319,32],[352,38],[386,60],[397,100],[391,153],[384,204],[373,232],[333,273],[284,231],[268,209],[267,152]], [331,232]],
                torso: [[[268,220],[288,224],[331,270],[370,219],[393,226],[452,254],[467,391],[467,671],[477,795],[365,803],[352,651],[286,649],[277,804],[185,794],[195,560],[211,391],[206,258]], [331,285]],
                'right-arm': [[[187,262],[219,251],[235,288],[214,435],[193,568],[175,675],[185,747],[181,792],[164,787],[142,766],[131,731],[135,680],[119,673],[135,508],[155,369]], [208,284],.41,.78],
                'left-arm': [[[446,251],[473,267],[493,364],[517,518],[530,673],[511,677],[511,730],[496,770],[466,791],[459,780],[466,740],[470,678],[456,530],[438,398],[426,282]], [451,284],.41,.78],
                'right-leg': [[[206,643],[327,642],[328,757],[307,963],[304,1162],[293,1238],[283,1290],[270,1315],[226,1317],[206,1305],[210,1280],[227,1240],[211,1182],[205,1010],[195,794]], [266,665],.5,.89],
                'left-leg': [[[329,643],[455,642],[459,789],[447,1010],[446,1190],[431,1239],[448,1284],[448,1306],[431,1317],[388,1316],[365,1301],[361,1278],[365,1237],[346,1150],[340,966],[330,770]], [391,665],.5,.89]
            }},
            'side-right': {crop:[640,20,315,1320],face:[[842,112,32,17],[842,112,32,17],[860,160,21,19]],parts:{
                'head-neck': [[[718,74],[757,43],[799,33],[843,48],[864,74],[874,111],[876,132],[886,148],[877,155],[879,175],[872,196],[843,204],[819,220],[813,244],[745,204],[734,169],[711,135]], [781,218]],
                torso: [[[699,154],[735,127],[747,192],[791,220],[844,264],[893,326],[915,394],[921,519],[923,670],[935,798],[885,806],[729,807],[677,795],[687,617],[711,547],[716,405],[702,482],[688,503],[668,478],[674,310]], [806,286]],
                'left-arm': [[[759,276],[793,263],[824,283],[849,341],[864,459],[876,567],[880,672],[891,715],[895,753],[876,783],[849,797],[837,788],[849,759],[844,728],[836,677],[817,679],[795,571],[772,463],[750,354]], [790,299],.48,.78],
                'right-arm': [[[759,276],[793,263],[824,283],[849,341],[864,459],[876,567],[880,672],[891,715],[895,753],[876,783],[849,797],[837,788],[849,759],[844,728],[836,677],[817,679],[795,571],[772,463],[750,354]], [772,301],.48,.78],
                'left-leg': [[[728,782],[865,783],[861,886],[839,1020],[837,1182],[851,1239],[895,1264],[915,1280],[915,1298],[896,1312],[776,1315],[723,1303],[721,1289],[732,1259],[725,1172],[724,994]], [789,794],.45,.87],
                'right-leg': [[[782,781],[877,784],[864,947],[852,1115],[850,1197],[872,1220],[914,1237],[921,1254],[915,1266],[858,1272],[811,1253],[795,1201],[791,1063]], [824,794],.48,.88]
            }}
        };
        const output={};
        for(const [key,d] of Object.entries(definitions)) {
            const [x,y,w,h]=d.crop, b={x:x/1122,y:y/1402,w:w/1122,h:h/1402}, c=crop(full,b), v=defaults(c.width,c.height,key);
            const pt=([px,py])=>({x:(px-x)/w,y:(py-y)/h});
            Object.assign(v,{source:c.toDataURL(),original:crop(original,b).toDataURL(),consentId:source.consentId,sha256:source.sha256});
            for(const [role,[poly,pivot,bend=.5,end=.88]] of Object.entries(d.parts)) Object.assign(v.parts[role],{polygon:poly.map(pt),pivot:pt(pivot),bend,end});
            ['eyeLeft','eyeRight','mouth'].forEach((f,i)=>{const [fx,fy,fw,fh]=d.face[i];v.face[f]={x:(fx-x)/w,y:(fy-y)/h,w:fw/w,h:fh/h};});
            if (key === 'side-right') for (const limb of ['arm','leg']) [v.parts[`right-${limb}`],v.parts[`left-${limb}`]] = [v.parts[`left-${limb}`],v.parts[`right-${limb}`]];
            output[key]=v;
        }
        return output;
    }
    function selected(config, requested) {
        const data = config._realisticCharacter;
        if (!data) return null;
        const view = requested || config.styling?.view || config.view || 'front';
        if (!data.views[view]) throw new Error(`This realistic character has no ${view.replaceAll('-', ' ')} artwork. Add that view in Realistic Characters first.`);
        return { data, view, artwork: data.views[view] };
    }
    function limbCenter(polygon, position) {
        const b=bounds(polygon), y=b.y+b.h*clamp(position,.0001,.9999), crossings=[];
        for(let i=0;i<polygon.length;i++) {
            const a=polygon[i],next=polygon[(i+1)%polygon.length];
            if((a.y<=y&&next.y>y)||(next.y<=y&&a.y>y))crossings.push(a.x+(y-a.y)*(next.x-a.x)/(next.y-a.y));
        }
        crossings.sort((a,b)=>a-b);
        let center=b.x+b.w/2,width=0;
        for(let i=0;i+1<crossings.length;i+=2)if(crossings[i+1]-crossings[i]>width){width=crossings[i+1]-crossings[i];center=(crossings[i]+crossings[i+1])/2;}
        return clamp((center-b.x)/b.w,.05,.95);
    }
    function assetFor(base, config) {
        const s = selected(config, base?.view);
        if (!s || !base) return base;
        const { data, artwork, view } = s, asset = clone(base);
        if (data.mode === 'hybrid') return asset;
        asset.realistic = true; asset.parts = {}; asset.pins = {}; asset.joints = clone(base.joints || {});
        if(artwork.parts['head-neck'].sourceImage && Array.isArray(asset.order)) {
            asset.order=asset.order.filter(key=>key!=='head-neck');
            asset.order.splice(Math.max(0,asset.order.indexOf('torso')),0,'head-neck');
        }
        if (view.includes('3q')) asset.threeQuarterAnatomy = { ...(asset.threeQuarterAnatomy || {}), projectionMode: 'authored-3q' };
        const sx = artwork.width / artwork.height * 600 * data.widthScale, sy = 600 * data.heightScale;
        const t = artwork.parts.torso, tb = bounds(t.polygon);
        for (const key of Object.keys(base.parts)) {
            const p = artwork.parts[roleFor(key, view)]; if (!p) continue;
            const b = bounds(p.polygon), head = key === 'head-neck' ? data.headScale : 1;
            const lift=key==='head-neck'&&p.sourceImage?tb.h*finite(data.neckLift,0,.2,.05):0;
            asset.parts[key] = { x: (p.pivot.x + (b.x - p.pivot.x) * head) * sx, y: (p.pivot.y-lift + (b.y - p.pivot.y) * head) * sy,
                width: b.w * sx * head, height: b.h * sy * head, pivotX: (p.pivot.x - b.x) / b.w, pivotY: (p.pivot.y - b.y) / b.h };
            if (key !== 'torso') asset.pins[key] = { mode: 'anchor', anchorX: (p.pivot.x - tb.x) / tb.w, anchorY: (p.pivot.y-lift - tb.y) / tb.h, rotation: 'inherit' };
            for (const [joint, spec] of Object.entries(asset.joints[key] || {})) {
                if (/elbow|knee/.test(joint)) {spec.position = p.bend;spec.crossOffset=limbCenter(p.polygon,p.bend);}
                else if (/wrist|ankle/.test(joint)) {spec.position = p.end;spec.crossOffset=limbCenter(p.polygon,p.end);}
                else if (/shoulder|hip/.test(joint)) spec.position = clamp((p.pivot.y - b.y) / b.h, 0, 1);
                else if (/neck/.test(joint)) {spec.position = clamp(1 - (p.pivot.y - b.y) / b.h, .01, .99);spec.photographic=true;spec.collarOverlap=!!p.sourceImage;spec.contourSize=.35;}
                if (/shoulder|hip|neck|waist/.test(joint)) spec.crossOffset = clamp((p.pivot.x - b.x) / b.w, .05, .95);
            }
        }
        return asset;
    }
    function render(config, partKey, view, singleHead = false) {
        const s = selected(config, view); if (!s) return '';
        if(partKey==='head-neck' && s.data.modules?.turns && s.data.mode!=='hybrid' && !singleHead) {
            const base=s.artwork.parts['head-neck'],bb=bounds(base.polygon),parser=new DOMParser();
            const shell=parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 170" width="400" height="680" overflow="visible" data-realistic-head-pack="true" data-head-turn-base="${view}"/>`,'image/svg+xml').documentElement;
            for(const key of views.filter(key=>s.data.views[key]?.parts['head-neck'].texture)) {
                const v=s.data.views[key],p=v.parts['head-neck'],b=bounds(p.polygon),node=parser.parseFromString(render(config,partKey,key,true),'image/svg+xml').documentElement;
                const w=b.w/bb.w*100,h=b.h/bb.h*170;
                node.setAttribute('x',String((base.pivot.x-bb.x)/bb.w*100-(p.pivot.x-b.x)/b.w*w));node.setAttribute('y',String((base.pivot.y-bb.y)/bb.h*170-(p.pivot.y-b.y)/b.h*h));
                node.setAttribute('width',w);node.setAttribute('height',h);node.setAttribute('overflow','visible');node.setAttribute('data-realistic-head-view',key);node.setAttribute('data-svg-african-view',key);node.setAttribute('display',key===view?'inline':'none');
                const ids=new Map([...node.querySelectorAll('[id]')].map(e=>[e.id,`${key}-${e.id}`]));
                for(const e of node.querySelectorAll('*'))for(const attr of [...e.attributes]) {
                    if(attr.name==='id')e.setAttribute('id',ids.get(attr.value));
                    else if(attr.value.startsWith('#')&&ids.has(attr.value.slice(1)))e.setAttribute(attr.name,'#'+ids.get(attr.value.slice(1)));
                    else if(attr.value.includes('url(#'))e.setAttribute(attr.name,attr.value.replace(/url\(#([^)]+)\)/g,(all,id)=>ids.has(id)?`url(#${ids.get(id)})`:all));
                }
                shell.appendChild(node);
            }
            return new XMLSerializer().serializeToString(shell);
        }
        let p = s.artwork.parts[roleFor(partKey, view)];
        if (!p?.texture) throw new Error('Prepare all realistic character parts before creating the character.');
        const hybrid = s.data.mode === 'hybrid';
        if (hybrid && partKey !== 'head-neck') throw new Error('Hybrid body artwork is supplied by the SVG renderer.');
        const frame = hybrid ? hybridFrame(s.data,s.artwork) : {x:0,y:0,w:100,h:170};
        if (hybrid) p = {...p,features:Object.fromEntries(Object.entries(p.features).map(([key,f])=>[key,{...f,x:(frame.x+f.x*frame.w)/100,y:(frame.y+f.y*frame.h)/170,w:f.w*frame.w/100,h:f.h*frame.h/170}]))};
        const img = (src, attrs = '') => `<image href="${src}" ${attrs} preserveAspectRatio="none"/>`;
        const placement = `x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}"`;
        let content = img(p.texture, placement);
        if(!hybrid && partKey!=='head-neck') {
            const partBounds=bounds(p.polygon);
            for(const layer of orderedLayers(s.artwork)) {
                if(!layer.visible || layer.role!==roleFor(partKey,view) || !layer.texture)continue;
                const b=bounds(layer.polygon), id=`region-${String(layer.id).replace(/[^a-zA-Z0-9_-]/g,'')}`;
                const filter=layer.tintStrength?`<defs><filter id="${id}" color-interpolation-filters="sRGB"><feFlood flood-color="${layer.tint}" flood-opacity="${layer.tintStrength}"/><feComposite in2="SourceGraphic" operator="atop"/></filter></defs>`:'';
                content+=filter+img(layer.texture,`data-realistic-layer="${id}" x="${(b.x-partBounds.x)/partBounds.w*100}" y="${(b.y-partBounds.y)/partBounds.h*170}" width="${b.w/partBounds.w*100}" height="${b.h/partBounds.h*170}" ${filter?`filter="url(#${id})"`:''}`);
            }
        }
        let meta = '';
        if (partKey === 'head-neck' && p.faceTexture && !view.startsWith('back')) {
            const f = p.features, mouth = f.upperLip, x = (mouth.x + mouth.w / 2) * 100, y = (mouth.y + mouth.h) * 170;
            const feather=(id,x,y,w,h)=>`<defs><linearGradient id="${id}-x"><stop stop-color="white" stop-opacity="0"/><stop offset=".15" stop-color="white"/><stop offset=".85" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="${id}-y" x2="0" y2="1"><stop stop-color="white" stop-opacity="0"/><stop offset=".2" stop-color="white"/><stop offset=".8" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="${id}-vertical" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-y)"/></mask><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-x)" mask="url(#${id}-vertical)"/></mask></defs>`;
            meta = `data-photo-face="v1" data-realistic-face="true" data-realistic-regions="v1" data-photo-mouth-x="${x}" data-photo-mouth-y="${y}" data-photo-mouth-width="${mouth.w * 100}"`;
            content = `<defs><filter id="realistic-repair-soften" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".65"/></filter>${img(p.faceTexture,`id="realistic-face-repair" ${placement} filter="url(#realistic-repair-soften)"`)}${img(p.texture,`id="realistic-original" ${placement}`)}</defs><g data-realistic-rest="true">${content}</g><g data-realistic-animated="true" opacity="0">`;
            for (const name of view.startsWith('side') ? ['eyeLeft'] : ['eyeLeft', 'eyeRight']) {
                const e = f[name];
                const id=`realistic-${name}-soft`;
                content += feather(id,(e.x-e.w*.15)*100,(e.y-e.h*.3)*170,e.w*130,e.h*272)+`<g data-realistic-region="eye" opacity="0" mask="url(#${id})"><use href="#realistic-original" transform="translate(0 ${-e.h*170*1.4})"/><g data-photo-eye="${name}" data-cx="${(e.x + e.w / 2) * 100}" data-cy="${(e.y + e.h / 2) * 170}" data-height="${e.h*170}"><g data-photo-pupil="${name}">${img(e.image, `x="${e.x * 100}" y="${e.y * 170}" width="${e.w * 100}" height="${e.h * 170}"`)}</g></g></g>`;
            }
            const mw=mouth.w*100;
            const repairY=y-Math.max(mw*.5,mouth.h*340),repairH=Math.max(mw,mouth.h*680);
            content += feather('realistic-mouth-soft',x-mw*.7,repairY,mw*1.4,repairH)+`<defs><clipPath id="realistic-mouth-region"><rect x="${x-mw*.7}" y="${repairY}" width="${mw*1.4}" height="${repairH}"/></clipPath></defs><g data-realistic-region="mouth" opacity="0" clip-path="url(#realistic-mouth-region)"><g mask="url(#realistic-mouth-soft)"><use href="#realistic-face-repair"/></g>`;
            content += `<defs><linearGradient id="realistic-mouth-depth" x2="0" y2="1"><stop stop-color="#10070a"/><stop offset=".65" stop-color="#2e1319"/><stop offset="1" stop-color="#54282d"/></linearGradient></defs><ellipse data-photo-cavity="true" cx="${x}" cy="${y}" rx="${mouth.w * 46}" ry=".1" fill="url(#realistic-mouth-depth)"/><ellipse data-photo-tongue="true" cx="${x}" cy="${y}" rx="0" ry="0" fill="#a6656d" opacity="0"/>`;
            for (const [key, name] of [['upperLip', 'upper'], ['lowerLip', 'lower']]) {
                const f = p.features[key], left=f.x*100, width=f.w*100;
                const soft=`realistic-${name}-soft`;
                content += feather(soft,left,f.y*170,width,f.h*170);
                content += `<defs>${img(f.image,`id="realistic-${name}-texture" x="${left}" y="${f.y*170}" width="${width}" height="${f.h*170}"`)}</defs>`;
                content += `<g data-photo-lip="${name}">`;
                // Piecewise affine strips share endpoints, retaining detail while flexing the lip.
                for(let i=0;i<12;i++) {
                    const id=`realistic-${name}-strip-${i}`, start=left+width*i/12, end=left+width*(i+1)/12;
                    content+=`<defs><clipPath id="${id}"><rect x="${start-.1}" y="${f.y*170}" width="${end-start+.2}" height="${f.h*170}"/></clipPath></defs><g data-photo-lip-strip="${i}" data-start="${start}" data-end="${end}" clip-path="url(#${id})"><g mask="url(#${soft})"><use href="#realistic-${name}-texture"/></g></g>`;
                }
                content += '</g>';
            }
            content += '</g></g>';
        }
        const filter = p.tint && p.tintStrength ? `<defs><filter id="realistic-tint" color-interpolation-filters="sRGB"><feFlood flood-color="${p.tint}" flood-opacity="${p.tintStrength}"/><feComposite in2="SourceGraphic" operator="atop"/></filter></defs>` : '';
        const nw = s.data.hybrid.neckWidth * 100;
        const taperStart=frame.y+frame.h*.66, taperEnd=frame.y+frame.h*.8;
        const neckShade='#'+[1,3,5].map(i=>Math.round(parseInt(s.data.hybrid.skin.slice(i,i+2),16)*.8).toString(16).padStart(2,'0')).join('');
        const neck = hybrid ? `<defs><linearGradient id="hybrid-neck-tone" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${neckShade}"/><stop offset="1" stop-color="${s.data.hybrid.skin}"/></linearGradient><clipPath id="hybrid-head-edge"><path d="M0 0 H100 V${taperStart} Q75 ${taperEnd} ${50+nw/2} ${taperEnd} V170 H${50-nw/2} V${taperEnd} Q25 ${taperEnd} 0 ${taperStart}Z"/></clipPath></defs><path data-hybrid-neck="true" d="M${50-nw/2} 112 L${49-nw/2} 168 Q50 172 ${51+nw/2} 168 L${50+nw/2} 112Z" fill="url(#hybrid-neck-tone)"/>` : '';
        if(hybrid) content=`<g clip-path="url(#hybrid-head-edge)">${content}</g>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 170" width="400" height="680" preserveAspectRatio="none" data-realistic-character="v1" ${hybrid ? 'data-hybrid-head="true"' : ''} ${meta}>${filter}${neck}<g ${filter ? 'filter="url(#realistic-tint)"' : ''} ${partKey === 'head-neck' ? 'id="head-motion" data-svg-african-role="head-motion"' : ''}>${content}</g></svg>`;
    }
    function hybridFrame(data, artwork) {
        const b=bounds(artwork.parts['head-neck'].polygon), w=80*data.hybrid.headWidth;
        const h=Math.min(130,w*(artwork.height*b.h)/(artwork.width*b.w));
        return {x:50-w/2,y:153-h+data.hybrid.headY,w,h};
    }
    function mouthAnchor(config) {
        const s=selected(config),f=s?.artwork.parts['head-neck'].features?.upperLip;
        if(!f) return null;
        const frame=s.data.mode==='hybrid'?hybridFrame(s.data,s.artwork):{x:0,y:0,w:100,h:170};
        return {x:(frame.x+(f.x+f.w/2)*frame.w)/100,y:(frame.y+(f.y+f.h)*frame.h)/170};
    }
    function applyHybridHands(raw, partKey, config, view) {
        if(config._realisticCharacter?.mode!=='hybrid' || view!=='front' || !/^(right|left)-arm$/.test(partKey)) return raw;
        const mode=config._realisticCharacter.hybrid?.hands?.[partKey.split('-')[0]];
        if(!mode || mode==='rest') return raw;
        const doc=new DOMParser().parseFromString(raw,'image/svg+xml'),root=doc.documentElement;
        const byRole=name=>[...root.querySelectorAll('[id]')].find(node=>node.id===name||node.id.endsWith('-'+name));
        const hand=byRole('hand');
        if(!hand || root.getAttribute('viewBox')!=='0 0 66 260') return raw;
        const paths={
            open:'M24 213 Q33 216 42 213 L43 225 Q49 221 50 225 Q51 228 44 234 L43 249 Q42 254 39 250 L38 238 L37 253 Q35 258 33 253 L32 238 L31 253 Q28 257 27 251 L26 237 L25 248 Q22 252 20 247 L19 232 Q19 222 24 213Z',
            point:'M24 213 Q33 216 42 213 L44 223 Q49 224 47 230 L41 234 L38 240 Q34 243 30 239 L28 235 L27 254 Q25 258 22 254 L21 232 Q20 220 24 213Z',
            grip:'M24 213 Q33 216 42 213 L44 224 Q49 227 46 233 L42 239 Q33 246 24 239 L21 234 Q18 225 24 213Z'
        };
        if(!paths[mode]) return raw;
        hand.setAttribute('d',paths[mode]);hand.setAttribute('data-hybrid-hand',mode);
        if(partKey==='left-arm') hand.setAttribute('transform',(hand.getAttribute('transform')||'')+' translate(66 0) scale(-1 1)');
        byRole('thumb')?.remove();byRole('finger-lines')?.remove();
        return new XMLSerializer().serializeToString(root);
    }
    function bodySettings(value) {
        if (!value || typeof value !== 'object' || typeof value.preset !== 'string') return null;
        // Keep appearance only, never another photographic package or stage/animation state.
        const body = {preset:value.preset.slice(0,80)};
        for (const key of ['identity','styling','premiumAdjustments']) {
            if (value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])) body[key] = clone(value[key]);
        }
        return JSON.stringify(body).length <= 64000 ? body : null;
    }
    function config(data, view) {
        data = normalize(data);
        if (!data) throw new Error('Invalid realistic character package.');
        selected({ _realisticCharacter: data }, view);
        if (data.mode === 'hybrid') {
            const base=globalThis.SvgAfricanCharacterCatalog.normalizeConfig(data.hybrid.body || {preset:data.hybrid.preset});
            // The catalog accepts flattened fields first; keep them in sync with styling.
            const sideFacing=view.endsWith('-left')?'left':'right';
            return {...base,name:data.name,_realisticCharacter:data,view,sideFacing,headwear:'none',styling:{...base.styling,view,sideFacing,headwear:'none'},_svgAfricanFaceState:{mouthOpen:0,smile:0}};
        }
        return { preset: 'female-doctor-premium', assetCharacterId: 'female-doctor-front', name: data.name, _realisticCharacter: data,
            styling: { view, accessories: [], headwear: 'none' }, _svgAfricanFaceState: { mouthOpen: 0, smile: 0 } };
    }
    async function fingerprint(v) {
        const text = JSON.stringify({ source:v.source, face:v.face, ...(Object.values(faceShape(v.faceShape)).some(Boolean)?{faceShape:faceShape(v.faceShape)}:{}), parts:Object.fromEntries(roles.map(k => { const p=v.parts[k]||{}; return [k,{polygon:p.polygon,pivot:p.pivot,bend:p.bend,end:p.end,replacement:p.replacement,tint:p.tint,tintStrength:p.tintStrength,...(p.sourceImage?{sourceImage:p.sourceImage}:{})}]; })),...(v.layers?.length?{layers:v.layers.map(({texture,...layer})=>layer)}:{}) });
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))), n=>n.toString(16).padStart(2,'0')).join('');
    }
    function viewAlignment(data) {
        const entries = Object.entries(data?.views || {});
        if (entries.length < 2) return [];
        const reference = entries.find(([key]) => key === 'front') || entries[0];
        const measure = v => {
            const boxes = Object.fromEntries(roles.map(role => [role, bounds(v.parts?.[role]?.polygon || [])]));
            const torso = boxes.torso;
            if (!Number.isFinite(torso.h) || torso.h <= .005) return null;
            const values = {};
            for (const role of roles.filter(role => role !== 'torso')) {
                const p = v.parts?.[role], box = boxes[role];
                if (!p || !Number.isFinite(box.h) || box.h <= .005) continue;
                values[role] = { length: box.h / torso.h, attachment: (p.pivot.y - torso.y) / torso.h };
            }
            return values;
        };
        const base = measure(reference[1]), issues = [];
        if (!base) return issues;
        for (const [view, artwork] of entries) {
            if (view === reference[0]) continue;
            const current = measure(artwork);
            if (!current) continue;
            for (const role of Object.keys(base)) {
                if (!current[role]) continue;
                const ratio = current[role].length / base[role].length;
                if (ratio < .75 || ratio > 1.25) issues.push({severity:'warning',view,role,message:`${view.replaceAll('-', ' ')}: ${labels[role]} height relative to the torso differs by more than 25% from ${reference[0].replaceAll('-', ' ')}.`});
                if (Math.abs(current[role].attachment - base[role].attachment) > .15) issues.push({severity:'warning',view,role,message:`${view.replaceAll('-', ' ')}: ${labels[role]} attachment height differs from ${reference[0].replaceAll('-', ' ')} by more than 15% of torso height.`});
            }
        }
        return issues;
    }
    function insideOutline(point, polygon) {
            let inside = false;
            for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
                const a=polygon[j], b=polygon[i], dx=b.x-a.x, dy=b.y-a.y;
                const t=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
                if (Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy)<.002) return true;
                if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
            }
            return inside;
    }
    function geometryIssues(v, view) {
        const issues = [], add = (severity,message) => issues.push({severity,message});
        const within = (p,b,pad=0) => p.x>=b.x-pad && p.y>=b.y-pad && p.x<=b.x+b.w+pad && p.y<=b.y+b.h+pad;
        for (const role of roles) {
            const p=v.parts?.[role];
            if (!p || !Array.isArray(p.polygon) || p.polygon.length<3 || !p.pivot) { add('error',`${labels[role]} outline or attachment is missing.`); continue; }
            const b=bounds(p.polygon);
            if (![b.x,b.y,b.w,b.h,p.pivot.x,p.pivot.y,p.bend,p.end].every(Number.isFinite) || b.w<.005 || b.h<.005) add('error',`${labels[role]} geometry is invalid.`);
            if (!within(p.pivot,b,.015)) add('error',`${labels[role]} attachment lies outside its outline.`);
            else if (!insideOutline(p.pivot,p.polygon)) add('warning',`${labels[role]} attachment is in empty space outside the cutout. Move it onto the part before checking bends.`);
            if (/arm|leg/.test(role) && p.bend>=p.end) add('error',`${labels[role]} bend must precede the wrist or ankle.`);
            if (b.x<0 || b.y<0 || b.x+b.w>1.001 || b.y+b.h>1.001) add('error',`${labels[role]} outline lies outside the image.`);
            if (role!=='torso' && v.parts.torso?.polygon?.length && !within(p.pivot,bounds(v.parts.torso.polygon),.06)) add('warning',`${labels[role]} attachment is distant from the torso.`);
        }
        if (!view.startsWith('back')) for (const key of ['mouth','eyeLeft',...(view.startsWith('side')?[]:['eyeRight'])]) {
            const b=v.face?.[key], head=bounds(v.parts?.['head-neck']?.polygon || []);
            if (!b || ![b.x,b.y,b.w,b.h].every(Number.isFinite) || b.w<.002 || b.h<.002 || !within({x:b.x,y:b.y},head) || !within({x:b.x+b.w,y:b.y+b.h},head)) add('error',`${key} must fit inside the head.`);
        }
        for(const layer of v.layers || []) {
            const b=bounds(layer.polygon||[]), part=v.parts?.[layer.role], pb=bounds(part?.polygon||[]);
            if(!part || layer.role==='head-neck' || !Number.isFinite(b.w+b.h) || b.w<.005 || b.h<.005 || !within({x:b.x,y:b.y},pb) || !within({x:b.x+b.w,y:b.y+b.h},pb))add('error',`${layer.name||'Clothing region'} must fit inside its body part.`);
            const s=layer.sourceRect;
            if(layer.kind==='repair'&&(!s||![s.x,s.y,s.w,s.h].every(Number.isFinite)||s.w<.002||s.h<.002||s.x<0||s.y<0||s.x+s.w>1||s.y+s.h>1))add('error',`${layer.name}: select a repair source inside the image.`);
            if(layer.extract&&layer.kind!=='repair'&&!v.layers.some(other=>other.role===layer.role&&other.kind==='repair'&&other.visible))add('warning',`${layer.name}: the extracted garment has no visible repair patch underneath. Hiding it may expose a hole.`);
        }
        return issues;
    }
    async function quality(v, view) {
        const issues=geometryIssues(v,view), add=(severity,message)=>issues.push({severity,message});
        const img=await image(v.source), c=canvas(128,128), ctx=c.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,128,128);
        const pixels=ctx.getImageData(0,0,128,128).data; let opaqueBorder=0,border=0,visible=0;
        for(let y=0;y<128;y++) for(let x=0;x<128;x++) { const a=pixels[(y*128+x)*4+3]; if(a>32) visible++; if(x<3||y<3||x>124||y>124) { border++; if(a>32) opaqueBorder++; } }
        if(visible<128) add('error','The image is empty or almost fully erased.');
        if(opaqueBorder/border>.2) add('warning','Background or clipped artwork remains along the image edges.');
        const feet=['right-leg','left-leg'].map(k=>{const b=bounds(v.parts?.[k]?.polygon || []);return b.y+b.h;});
        if(Math.abs(feet[0]-feet[1])>.07) add('warning','The feet have noticeably different ground levels.');
        return {issues,fingerprint:await fingerprint(v)};
    }
    function headPack(data) {
        const pack={version:1,views:{}};
        for(const [key,v] of Object.entries(data.views)) {
            const p=v.parts['head-neck'],b=bounds(p.polygon);
            if(!p.sourceImage)throw new Error('Head pack requires isolated head artwork.');
            pack.views[key]={image:p.sourceImage,pivot:{x:(p.pivot.x-b.x)/b.w,y:(p.pivot.y-b.y)/b.h},face:Object.fromEntries(Object.entries(v.face).map(([k,f])=>[k,{x:(f.x-b.x)/b.w,y:(f.y-b.y)/b.h,w:f.w/b.w,h:f.h/b.h}]))};
        }
        return pack;
    }
    async function composeModules(body, pack, options={}) {
        const data=normalize(body);if(!data||data.mode==='hybrid'||pack?.version!==1)throw new Error('Select compatible photographic modules.');
        const size={slim:.94,standard:1,broad:1.08}[options.build]||1;
        const fit=finite(options.headFit,.9,1.1,1);
        for(const [key,v] of Object.entries(data.views)) {
            const donor=pack.views?.[key];
            if(!donor||!png(donor.image)||!donor.pivot||![donor.pivot.x,donor.pivot.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error(`Head pack has no compatible ${key} attachment.`);
            if(!roles.every(role=>v.parts[role].sourceImage))throw new Error('Body family requires independent parts.');
            const p=v.parts['head-neck'],b=bounds(p.polygon),pivot=clone(p.pivot),w=b.w*fit,h=b.h*fit,x=pivot.x-donor.pivot.x*w,y=pivot.y-donor.pivot.y*h;
            p.polygon=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];p.sourceImage=donor.image;
            for(const name of ['eyeLeft','eyeRight','mouth']) {
                const f=donor.face?.[name];if(!f||![f.x,f.y,f.w,f.h].every(Number.isFinite))throw new Error(`Missing ${name} calibration for ${key}.`);
                v.face[name]={x:x+f.x*w,y:y+f.y*h,w:f.w*w,h:f.h*h};
            }
            const center=v.parts.torso.pivot.x;
            for(const role of roles.filter(r=>r!=='head-neck')) {
                const part=v.parts[role];part.polygon=part.polygon.map(pt=>({...pt,x:center+(pt.x-center)*size}));part.pivot.x=center+(part.pivot.x-center)*size;
                if(role==='torso'){part.tint={teal:'#16746d',burgundy:'#872b44'}[options.outfit]||'';part.tintStrength=part.tint ? .32 : 0;}
            }
            delete v.qualityReview;v.consentId='';v.sha256='';
            const c=canvas(v.width,v.height),ctx=c.getContext('2d');
            for(const role of ['left-leg','right-leg','left-arm','torso','head-neck','right-arm']){
                const part=v.parts[role],b=bounds(part.polygon),piece=canvas(b.w*c.width,b.h*c.height),pc=piece.getContext('2d');pc.drawImage(await image(part.sourceImage),0,0,piece.width,piece.height);
                if(part.tint&&part.tintStrength){pc.globalCompositeOperation='source-atop';pc.globalAlpha=part.tintStrength;pc.fillStyle=part.tint;pc.fillRect(0,0,piece.width,piece.height);}
                ctx.drawImage(piece,b.x*c.width,b.y*c.height,b.w*c.width,b.h*c.height);
            }
            v.source=c.toDataURL();v.original=v.source;await compile(v,key);
        }
        data.modules={version:1,...options};data.revision=Date.now().toString(36);data.provenance={kind:'generated',sourceName:'Modular photographic assembly',consentId:''};
        const result=normalize(data);if(!result)throw new Error('Assembled package exceeds storage limits.');return result;
    }
    global.RealisticCharacter = Object.freeze({ views, roles, labels, normalize, defaults, bounds, insideOutline, limbCenter, image, canvas, crop, compile, selected, assetFor, render, config, roleFor, fitLandmarks, doctorLayout, fingerprint, quality, viewAlignment, mouthAnchor, applyHybridHands, bodySettings, orderedLayers, layerCanvas, headPack, composeModules, faceShape, reshapeHead });
})(globalThis);
