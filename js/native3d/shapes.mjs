// Primitive dimensions are metres in object space, before transform scale.
export const shapeSpecs={
    box:[['width','Width · X',1],['height','Height · Y',1],['depth','Depth · Z',1]],
    plane:[['width','Width · X',1],['depth','Depth · Z',1]],
    sphere:[['radius','Radius',.5]],
    cylinder:[['radiusTop','Top radius',.5],['radiusBottom','Bottom radius',.5],['height','Height · Y',1]]
};
export function shapeValues(node){return node.shape||Object.fromEntries((shapeSpecs[node.kind]||[]).map(([key,,value])=>[key,value]));}
export function validateShape(node){
    if(node.shape===undefined)return;
    const spec=shapeSpecs[node.kind],s=node.shape;
    if(!spec||!s||Array.isArray(s)||typeof s!=='object'||Object.keys(s).length!==spec.length||spec.some(([key])=>typeof s[key]!=='number'||!Number.isFinite(s[key])||s[key]>(key.startsWith('radius')?500:1000)||s[key]<(node.kind==='cylinder'&&key.startsWith('radius')?0:.001))||node.kind==='cylinder'&&s.radiusTop===0&&s.radiusBottom===0)throw Error('Invalid shape dimensions: use positive sizes up to 1000 m and radii up to 500 m; a cylinder needs at least one nonzero radius');
}
export function shapeSize(node){const s=shapeValues(node);if(node.kind==='box')return [s.width,s.height,s.depth];if(node.kind==='plane')return [s.width,0,s.depth];if(node.kind==='sphere')return [s.radius*2,s.radius*2,s.radius*2];const d=2*Math.max(s.radiusTop,s.radiusBottom);return [d,s.height,d];}
