import {createNode,validateProject} from './project.mjs';

export const propCatalogue=[
    {id:'bookcase',name:'Bookcase',category:'Furniture',description:'Open shelves with individually editable books.',size:[1.2,1.8,.36],min:[.6,.8,.2],max:[3,3,.8],color:'#ad7847'},
    {id:'sofa',name:'Sofa',category:'Furniture',description:'Two-seat sofa with separate cushions, arms and legs.',size:[2,.9,.9],min:[1,.6,.6],max:[3.5,1.4,1.5],color:'#477b9e'},
    {id:'bed',name:'Bed',category:'Furniture',description:'Bed frame, mattress, blanket, pillows and headboard.',size:[1.6,.75,2.1],min:[.8,.45,1.5],max:[2.5,1.4,2.6],color:'#537a9c'},
    {id:'plant',name:'Potted plant',category:'Nature',description:'Tapered pot and lightweight 3D foliage.',size:[.6,1.2,.6],min:[.3,.5,.3],max:[1.2,2.5,1.2],color:'#ba7659'},
    {id:'lectern',name:'Lectern',category:'Furniture',description:'Standing podium with a flat reading top and front panel.',size:[.7,1.1,.5],min:[.4,.7,.3],max:[1.2,1.5,.8],color:'#a77b50'},
    {id:'bench',name:'Bench',category:'Furniture',description:'Slatted bench with separate supports and legs.',size:[1.5,.48,.45],min:[.8,.35,.3],max:[2.8,.7,.8],color:'#a77b50'}
];
const surface=(roughness=.75,metalness=0)=>({roughness,metalness,opacity:1,texture:null,repeat:[1,1]});
export function makeProp(id,{size,color,position=[0,0,0]}={}){
    const spec=propCatalogue.find(p=>p.id===id);if(!spec)throw Error('Choose a prop from the library');
    size??=spec.size;color??=spec.color;
    if(!Array.isArray(size)||size.length!==3||size.some((v,i)=>!Number.isFinite(v)||v<spec.min[i]||v>spec.max[i]))throw Error('Choose dimensions within this prop’s displayed limits');
    if(!/^#[a-f\d]{6}$/i.test(color)||!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw Error('Choose a valid colour and placement');
    const [w,h,d]=size,root=createNode('group',{name:spec.name,position}),nodes=[root],wood='#9b704b',dark='#38434c';
    const box=(name,s,p,c=color,roughness=.75)=>nodes.push(createNode('box',{name,parent:root.id,shape:{width:s[0]*w,height:s[1]*h,depth:s[2]*d},position:[p[0]*w,p[1]*h,p[2]*d],color:c,surface:surface(roughness)}));
    const cylinder=(name,rTop,rBottom,height,y,c)=>nodes.push(createNode('cylinder',{name,parent:root.id,shape:{radiusTop:rTop*Math.min(w,d),radiusBottom:rBottom*Math.min(w,d),height:height*h},position:[0,y*h,0],color:c,surface:surface()}));
    const leaf=(name,s,p,c)=>nodes.push(createNode('sphere',{name,parent:root.id,shape:{radius:.5},scale:[s[0]*w,s[1]*h,s[2]*d],position:[p[0]*w,(p[1]-s[1]/2)*h,p[2]*d],color:c,surface:surface(.9)}));
    if(id==='bookcase'){
        for(const x of [-.47,.47])box(x<0?'Left side':'Right side',[.06,1,1],[x,0,0]);
        box('Back panel',[.88,1,.035],[0,0,-.4825]);for(const [i,y]of [0,.32,.64,.96].entries())box('Shelf '+(i+1),[.88,.04,.92],[0,y,0]);
        const colors=['#477b9e','#bb6258','#d4ae62','#63866c','#8b719e','#c8804b'];
        for(let i=0;i<6;i++)box('Lower book '+(i+1),[.075,.22+(i%3)*.02,.65],[-.34+i*.11,.04,.04],colors[i]);
        for(let i=0;i<4;i++)box('Upper book '+(i+1),[.065,.21+(i%2)*.025,.6],[-.22+i*.1,.68,.06],colors[(i+2)%6]);
    }else if(id==='sofa'){
        for(const x of [-.4,.4])for(const z of [-.37,.37])box('Sofa leg',[.06,.15,.08],[x,0,z],dark);
        box('Seat base',[.9,.22,.9],[0,.15,.05]);box('Back',[.9,.63,.15],[0,.37,-.425]);
        for(const x of [-.45,.45])box(x<0?'Left arm':'Right arm',[.1,.5,.9],[x,.28,0]);
        for(const x of [-.205,.205]){box('Seat cushion',[.39,.16,.65],[x,.37,.15]);box('Back cushion',[.39,.4,.13],[x,.55,-.27]);}
    }else if(id==='bed'){
        for(const x of [-.43,.43])for(const z of [-.43,.43])box('Bed leg',[.07,.16,.07],[x,0,z],dark);
        box('Bed frame',[1,.18,1],[0,.16,0],wood);box('Headboard',[1,1,.045],[0,0,-.4775],wood);
        box('Mattress',[.94,.33,.92],[0,.34,.01],'#e9e1d3');box('Blanket',[.95,.04,.58],[0,.67,.18]);
        for(const x of [-.22,.22])box('Pillow',[.38,.09,.2],[x,.67,-.25],'#eee8de');
    }else if(id==='plant'){
        cylinder('Plant pot',.21,.16,.25,0,color);cylinder('Soil',.19,.19,.015,.25,'#514235');cylinder('Stem',.025,.025,.6,.25,'#476a3b');
        leaf('Left foliage',[.6,.32,.6],[-.2,.6,0],'#3d7c4b');leaf('Right foliage',[.6,.32,.6],[.2,.72,0],'#4c8b56');
        leaf('Front foliage',[.6,.32,.6],[0,.84,.2],'#559760');leaf('Back foliage',[.6,.32,.6],[0,.7,-.2],'#397347');
    }else if(id==='lectern'){
        box('Base',[.9,.04,1],[0,0,0],dark);box('Column',[.18,.9,.25],[0,.04,0]);box('Front panel',[.7,.5,.07],[0,.33,.1]);box('Reading top',[1,.06,1],[0,.94,0],color,.5);
    }else if(id==='bench'){
        for(const x of [-.4,.4])for(const z of [-.32,.32])box('Bench leg',[.055,.84,.12],[x,0,z],dark);
        for(const x of [-.4,.4])box('Seat support',[.07,.08,.94],[x,.84,0],dark);
        for(const z of [-.375,-.125,.125,.375])box('Seat slat',[1,.08,.25],[0,.92,z]);
    }
    return {nodes,rootId:root.id};
}
export function insertProp(project,id,options){const prop=makeProp(id,options);if(project.nodes.length+prop.nodes.length>300)throw Error('This prop would exceed the scene limit of 300 objects');return {project:validateProject({...project,nodes:[...project.nodes,...prop.nodes]}),selected:prop.rootId,count:prop.nodes.length};}
