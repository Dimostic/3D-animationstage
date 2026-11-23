import {TextureLoader,SRGBColorSpace,RepeatWrapping,Color} from 'three';
export const surfaceKinds=['box','sphere','cylinder','plane','chair','table','document','emoji','text','model'];
export const surfacePresets={Matte:[.85,0,1],Plastic:[.3,0,1],Metal:[.25,1,1],Wood:[.7,0,1],Stone:[.95,0,1],Fabric:[1,0,1],Translucent:[.25,0,.45]};
export async function applySurface(root,node,assets,retired){
    if(!node.surface)return;const s=node.surface;let map;
    if(s.texture){map=await new TextureLoader().loadAsync(assets[s.texture].data);retired.add(map);const image=map.image;if(image.width>2048||image.height>2048)throw Error('Textures must be at most 2048 pixels per side');map.colorSpace=SRGBColorSpace;map.wrapS=map.wrapT=RepeatWrapping;map.repeat.fromArray(s.repeat);}
    let first;root.traverse(o=>{if(o.isMesh&&!first)first=[o.material].flat()[0];});
    const tint=new Color(node.color);
    root.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
        if(!m.isMeshStandardMaterial)continue;
        // Furniture hardware, paper ink and facial details retain their accents.
        if(node.kind!=='model'&&m!==first&&!m.color.equals(tint))continue;
        m.color.copy(tint);m.roughness=s.roughness;m.metalness=s.metalness;m.opacity=s.opacity;m.transparent=s.opacity<1;m.depthWrite=s.opacity===1;
        if(map){if(m.map)retired.add(m.map);m.map=map;}m.needsUpdate=true;
    }});
}
export function collectImages(p){const used=new Set(p.nodes.map(n=>n.surface?.texture));for(const [id,a]of Object.entries(p.assets))if(a.type==='image'&&!used.has(id))delete p.assets[id];}
