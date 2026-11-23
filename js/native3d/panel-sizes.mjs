const clamp=(value,min,max)=>Math.min(Math.max(min,max),Math.max(min,value));
export function setupPanelSizes(saved={},onChange=()=>{}){
    const main=document.querySelector('main'),center=main.querySelector('.center'),mobile=matchMedia('(max-width:760px)'),panels={scene:main.querySelector('.scene-panel'),inspector:main.querySelector('.inspector'),timeline:main.querySelector('.timeline')};
    const sizes={};for(const key of ['scene','inspector','timeline','sceneHeight','inspectorHeight'])if(Number.isFinite(saved?.[key])&&saved[key]>0)sizes[key]=Math.min(2000,saved[key]);
    let drag=null;const handles={};
    function limits(key){
        if(key==='timeline')return [90,mobile.matches?Math.min(600,innerHeight*.65):Math.max(90,center.clientHeight-190-(center.querySelector('.viewport-toolbar').hidden?0:center.querySelector('.viewport-toolbar').offsetHeight)-8)];
        if(mobile.matches)return [120,Math.max(120,innerHeight*.8)];
        const other=key==='scene'?'inspector':'scene',used=panels[other].hidden?0:panels[other].getBoundingClientRect().width+8;
        return [150,Math.min(600,main.clientWidth-used-268)];
    }
    const property=key=>mobile.matches&&key!=='timeline'?key+'Height':key;
    const measure=key=>panels[key].getBoundingClientRect()[mobile.matches||key==='timeline'?'height':'width'];
    function apply(){
        center.style.setProperty('--timeline-max-height',Math.round(limits('timeline')[1])+'px');
        for(const key of ['scene','inspector']){
            main.style.setProperty('--preferred-'+key+'-width',(sizes[key]??(innerWidth<=1100?(key==='scene'?180:230):(key==='scene'?215:265)))+'px');
            main.style.setProperty('--preferred-'+key+'-height',(sizes[key+'Height']??(key==='scene'?240:360))+'px');
        }
        if(sizes.timeline)center.style.setProperty('--preferred-timeline-height',clamp(sizes.timeline,...limits('timeline'))+'px');else center.style.removeProperty('--preferred-timeline-height');
        for(const [key,handle]of Object.entries(handles)){
            handle.hidden=panels[key].hidden;const vertical=mobile.matches||key==='timeline',[min,max]=limits(key);
            handle.setAttribute('aria-orientation',vertical?'horizontal':'vertical');handle.setAttribute('aria-valuemin',Math.round(min));handle.setAttribute('aria-valuemax',Math.round(Math.max(min,max)));handle.setAttribute('aria-valuenow',Math.round(measure(key)));handle.setAttribute('aria-valuetext',Math.round(measure(key))+' pixels '+(vertical?'high':'wide'));
        }
    }
    function set(key,value){const range=limits(key);sizes[property(key)]=clamp(value,...range);apply();}
    function finish(event,cancel=false){if(!drag||event&&event.pointerId!==drag.id)return;const old=drag;drag=null;if(cancel){for(const key of Object.keys(sizes))delete sizes[key];Object.assign(sizes,old.before);apply();}document.body.classList.remove('resizing-panels','resizing-rows');if(old.handle.hasPointerCapture(old.id))old.handle.releasePointerCapture(old.id);onChange();}
    for(const key of Object.keys(panels)){
        const handle=document.createElement('div');handle.className='panel-resizer resize-'+key;handle.tabIndex=0;handle.role='separator';handle.setAttribute('aria-label','Resize '+key+' panel');handle.setAttribute('aria-controls',panels[key].id);handle.title='Resize '+key+' — drag this edge, or use arrow keys. Double-click to reset.';handles[key]=handle;
        if(key==='timeline')center.insertBefore(handle,panels[key]);else panels[key].after(handle);
        handle.onpointerdown=event=>{if(event.button!==0||drag)return;event.preventDefault();handle.focus();const vertical=mobile.matches||key==='timeline';drag={key,id:event.pointerId,start:vertical?event.clientY:event.clientX,value:measure(key),sign:key==='timeline'||key==='inspector'&&!vertical?-1:1,vertical,before:{...sizes},handle};handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing-panels');document.body.classList.toggle('resizing-rows',vertical);};
        handle.onpointermove=event=>{if(!drag||drag.id!==event.pointerId||drag.key!==key)return;set(key,drag.value+((drag.vertical?event.clientY:event.clientX)-drag.start)*drag.sign);};
        handle.onpointerup=event=>finish(event);handle.onpointercancel=event=>finish(event,true);handle.onlostpointercapture=event=>finish(event);
        handle.ondblclick=()=>{delete sizes[property(key)];apply();onChange();};
        handle.onkeydown=event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();finish(null,true);return;}const vertical=mobile.matches||key==='timeline',negative=vertical?'ArrowUp':'ArrowLeft',positive=vertical?'ArrowDown':'ArrowRight';if(![negative,positive,'Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const [min,max]=limits(key),direction=key==='timeline'||key==='inspector'&&!vertical?-1:1;set(key,event.key==='Home'?min:event.key==='End'?max:measure(key)+(event.key===positive?1:-1)*direction*(event.shiftKey?40:10));onChange();};
    }
    function fit(){if(drag)finish(null,true);if(!mobile.matches){for(const key of ['scene','inspector'])if(!panels[key].hidden&&sizes[key])sizes[key]=clamp(sizes[key],...limits(key));}apply();}
    window.addEventListener('resize',fit);document.addEventListener('workspace-layout',fit);window.addEventListener('blur',()=>finish(null,true));
    new ResizeObserver(()=>apply()).observe(center);
    fit();return {sizes,reset(){finish(null,true);for(const key of Object.keys(sizes))delete sizes[key];apply();}};
}
