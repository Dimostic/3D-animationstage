import {mountControlSearch} from './control-search.mjs';
import {setupPanelSizes} from './panel-sizes.mjs';
const KEY='animationstage.native3d.layout.v1';
const hints={
    new:'New scene — start an empty 3D project.',open:'Open — load a saved .stage3d project.',save:'Save Project — download your editable scene and embedded assets.',recover:'Recover — restore the last browser recovery copy.',example:'Classroom Example — replace the scene with a starter classroom.',
    export:'Export — create a movie, image or GLB snapshot in the selected format.','export-type':'Export format — choose movie, PNG image or GLB scene snapshot.',
    undo:'Undo — reverse the last scene edit (Ctrl+Z).',redo:'Redo — restore an undone edit (Ctrl+Shift+Z).',quality:'Quality — lower to Draft for a faster viewport on this computer.',
    'add-kind':'Object type — choose a character, shape, prop or scene tool.',add:'Add — place the chosen 3D object in the scene.',import:'Import GLB Model — add a self-contained 3D model from your computer.',duplicate:'Duplicate — make a copy of the selected object.',delete:'Delete — remove the selected object. Undo can restore it.',
    frame:'Frame — fit the selected object, or the whole scene, into view (F).',snap:'Snap — move in 0.1 metre steps and rotate in 15 degree steps.','camera-view':'Camera View — switch between the editor view and the scene camera.',
    play:'Play / Pause — preview scene animation and sound (Space).',rewind:'Start — pause and return to the beginning.',key:'Add Transform Key — remember the selected object’s position, rotation and size at this time.','clear-keys':'Clear Keys — remove transform animation and keep the current pose.',time:'Scene time — drag to preview a moment without playing.',duration:'Duration — set the scene length in seconds.',
    'use-view':'Use Editor View as Camera — save the current framing as the scene camera.','use-camera':'Use Selected Camera — use the selected camera object for scene framing.',
    'import-speech':'Import Speech Audio — add a local recording, assign a speaker and type captions.','conversation-example':'Try Conversation Example — load two characters with recordings and captions.','captions-enabled':'Captions — show or hide captions during preview.','caption-speakers':'Speaker names — include the speaker’s name in captions.',
    'detach-document':'Detach at Current Pose — release the document from its hand and keep its current position.',
};
export function setupLayout(){
    const $=s=>document.querySelector(s),body=document.body;
    let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch{}
    const names={scene:'Scene',inspector:'Inspector',timeline:'Timeline',tools:'Tools',project:'Project menus'};
    const targets={scene:$('.scene-panel'),inspector:$('.inspector'),timeline:$('.timeline'),tools:$('.viewport-toolbar'),project:$('header.top')};
    let focus=false,stageCollapsed=saved.stageCollapsed===true;const collapsed={};for(const key of Object.keys(names))collapsed[key]=saved.collapsed?.[key]===true;
    const bar=document.createElement('div');bar.className='workspace-viewbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Workspace layout');
    bar.innerHTML='<strong>Workspace</strong><div class="layout-toggles"></div><div class="spacer"></div><button id="stage-collapse" type="button">Collapse Stage</button><button id="stage-focus" type="button">Expand Stage</button><button id="stage-play" type="button" hidden>Play / Pause</button><button id="stage-fullscreen" type="button">Full Screen</button><button id="layout-reset" type="button">Reset Layout</button>';
    body.insertBefore(bar,body.firstChild);const buttons={};
    function store(){try{localStorage.setItem(KEY,JSON.stringify({collapsed,stageCollapsed,details:details.map(el=>el.open),sizes:resizing.sizes}));}catch{}}
    function apply(){
        body.classList.toggle('stage-focus',focus);body.classList.toggle('timeline-focus',stageCollapsed&&!focus);$('#stage-collapse').textContent=stageCollapsed&&!focus?'Show Stage':'Collapse Stage';$('#stage-collapse').setAttribute('aria-expanded',String(!stageCollapsed||focus));
        for(const [key,target]of Object.entries(targets)){
            const hidden=focus||collapsed[key];target.hidden=hidden;body.classList.toggle('collapsed-'+key,hidden);
            buttons[key].setAttribute('aria-expanded',String(!hidden));buttons[key].textContent=(hidden?'+ ':'− ')+names[key];buttons[key].title=`${hidden?'Show':'Hide'} ${names[key]} — ${hidden?'restore these controls':'make more room for the stage'}.`;
        }
        $('.projectbar').hidden=focus||collapsed.project;$('footer').hidden=focus;
        $('#stage-focus').textContent=focus?'Restore Workspace':'Expand Stage';$('#stage-focus').setAttribute('aria-pressed',String(focus));
        $('#stage-focus').title=focus?'Restore Workspace — return to your previous panel layout (Escape).':'Expand Stage — temporarily hide panels and menus for a larger stage.';
        $('#stage-play').hidden=!focus;$('#stage-play').title='Play / Pause — preview the scene without leaving the large stage view.';
        document.dispatchEvent(new Event('workspace-layout'));
    }
    for(const [key,target]of Object.entries(targets)){
        target.id ||= 'workspace-'+key;const button=document.createElement('button');button.type='button';button.dataset.panel=key;button.setAttribute('aria-controls',target.id);buttons[key]=button;bar.querySelector('.layout-toggles').append(button);
        button.onclick=()=>{if(focus){focus=false;collapsed[key]=false;}else collapsed[key]=!collapsed[key];apply();store();};
        if(['scene','inspector'].includes(key)){
            const close=document.createElement('button');close.type='button';close.className='panel-collapse';close.textContent='−';close.setAttribute('aria-label','Collapse '+names[key]);close.title='Collapse '+names[key]+' — reopen it from the Workspace bar.';close.onclick=()=>{collapsed[key]=true;apply();store();};target.querySelector('.panel-title').append(close);
        }
    }
    // Group the longer inspector menus without changing their existing forms.
    for(const fieldset of document.querySelectorAll('.inspector fieldset')){
        const legend=fieldset.querySelector(':scope > legend');if(!legend)continue;
        const group=document.createElement('details'),summary=document.createElement('summary');group.className='inspector-section';group.open=!fieldset.closest('#scene-form');summary.textContent=legend.textContent;fieldset.before(group);group.append(summary,fieldset);
    }
    // Disclosure state is a browser preference, never part of a saved scene.
    const details=[...document.querySelectorAll('.inspector details,#speech-panel')],defaults=details.map(el=>el.open);
    const resizing=setupPanelSizes(saved.sizes,store);
    details.forEach((el,i)=>{if(typeof saved.details?.[i]==='boolean')el.open=saved.details[i];el.addEventListener('toggle',store);});
    $('#stage-collapse').onclick=()=>{if(focus)focus=false;stageCollapsed=!stageCollapsed;collapsed.timeline=false;apply();store();};
    $('#stage-focus').onclick=()=>{stageCollapsed=false;focus=!focus;apply();};
    $('#stage-play').onclick=()=>$('#play').click();
    $('#layout-reset').title='Reset Layout — show all panels and restore the default expanded sections.';
    $('#layout-reset').onclick=()=>{focus=false;stageCollapsed=false;for(const key of Object.keys(names))collapsed[key]=false;details.forEach((el,i)=>el.open=defaults[i]);resizing.reset();apply();store();};
    $('#stage-fullscreen').title='Full Screen — use the whole display. Press Escape to leave browser full screen.';
    $('#stage-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await body.requestFullscreen();}catch{$('#status').textContent='Full screen is unavailable here. Expand Stage still provides a larger workspace.';}};
    document.addEventListener('fullscreenchange',()=>{$('#stage-fullscreen').textContent=document.fullscreenElement?'Exit Full Screen':'Full Screen';});
    window.addEventListener('keydown',event=>{if(event.key==='Escape'&&focus&&!document.body.classList.contains('editing-grip')&&!document.body.classList.contains('editing-camera-frame')&&!document.querySelector('dialog[open]')&&!document.fullscreenElement){focus=false;apply();event.preventDefault();event.stopImmediatePropagation();$('#stage-focus').focus();}},true);
    apply();
    installHelp();
}
function installHelp(){
    const selector='button,select,input:not([type=hidden]),summary,a';
    function label(el){return (el.getAttribute('aria-label')||(el.labels?.[0]?[...el.labels[0].childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim():'')||el.textContent||el.name||'Control').replace(/\s+/g,' ').trim().slice(0,120);}
    function describe(el){
        if(hints[el.id])return hints[el.id];
        if(el.dataset.mode)return ({translate:'Move (W) — drag an axis arrow to reposition the selected object.',rotate:'Rotate (E) — drag a ring to turn the selected object.',scale:'Scale (R) — drag a handle to resize the selected object.'})[el.dataset.mode];
        if(el.matches('#hierarchy button'))return label(el)+' — select this object to inspect or edit it.';
        if(el.matches('#key-list button'))return label(el)+' — jump to this animation key.';
        if(el.matches('[data-preview-button]'))return 'Preview Camera — check movie framing at the selected start time without exporting.';
        if(el.matches('[data-cancel]'))return 'Cancel Export — stop rendering, restore the editor and discard the unfinished movie.';
        if(el.matches('[data-start]'))return 'Export Movie — render and download a finished movie with the selected settings.';
        if(el.matches('[data-close]'))return 'Close — return to the workspace; a running export will first be cancelled.';
        if(el.matches('summary'))return label(el)+' — expand or collapse this section.';
        if(el.matches('input,select'))return label(el)+' — '+(el.type==='checkbox'?'turn this setting on or off.':el.tagName==='SELECT'?'choose an option.':'edit this value; use Apply Changes or the section’s Apply button where shown.');
        return label(el)+' — '+(el.tagName==='A'?'open this destination.':'activate this action.');
    }
    let helpMode=localStorage.getItem('animationstage.native3d.help')||'on',lastAction=Date.now();const seen=new WeakMap();const help=document.createElement('select');help.id='help-mode';help.setAttribute('aria-label','Hover explanations');for(const [value,text]of [['on','Help: On'],['idle','Help: First / after idle'],['off','Help: Off']])help.add(new Option(text,value));help.value=helpMode;document.querySelector('.workspace-viewbar').append(help);help.onchange=()=>{helpMode=help.value;localStorage.setItem('animationstage.native3d.help',helpMode);hide();for(const el of document.querySelectorAll(selector)){if(helpMode==='off'){if(el.title)el.dataset.savedHelp=el.title;el.removeAttribute('title');}else if(el.dataset.savedHelp)el.title=el.dataset.savedHelp;}};document.addEventListener('pointerdown',()=>lastAction=Date.now());document.addEventListener('keydown',()=>lastAction=Date.now());
    function annotate(root){for(const el of [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)])if(!el.title){const text=el.dataset.savedHelp||describe(el);if(helpMode==='off')el.dataset.savedHelp=text;else el.title=text;}}
    annotate(document.body);
    // Native titles work on disabled controls too; the shared tooltip also works
    // on keyboard focus and within modal dialogs (which occupy the top layer).
    const tip=document.createElement('div');tip.id='workspace-tooltip';tip.role='tooltip';tip.hidden=true;let active=null,timer;
    function hide(){clearTimeout(timer);if(active){const ids=(active.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==tip.id);if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');}active=null;tip.hidden=true;}
    function show(el){hide();if(helpMode==='off'||!el?.title)return;const previous=seen.get(el);if(helpMode==='idle'&&previous&&Date.now()-lastAction<30000&&Date.now()-previous<30000)return;seen.set(el,Date.now());active=el;timer=setTimeout(()=>{if(!active?.isConnected)return;tip.textContent=active.title;(active.closest('dialog')||document.body).append(tip);tip.hidden=false;const rect=active.getBoundingClientRect(),bounds=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(innerWidth-bounds.width-8,rect.left))+'px';tip.style.top=(rect.bottom+bounds.height+12<innerHeight?rect.bottom+8:Math.max(8,rect.top-bounds.height-8))+'px';active.setAttribute('aria-describedby',((active.getAttribute('aria-describedby')||'')+' '+tip.id).trim());},450);}
    document.addEventListener('pointerover',e=>{const el=e.target.closest(selector);if(el&&el!==active)show(el);});
    document.addEventListener('pointerout',e=>{if(active&&active.contains(e.target)&&!active.contains(e.relatedTarget)&&document.activeElement!==active)hide();});
    document.addEventListener('focusin',e=>show(e.target.closest(selector)));
    document.addEventListener('focusout',hide);document.addEventListener('pointerdown',hide);document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});window.addEventListener('resize',hide);document.addEventListener('scroll',hide,true);
    mountControlSearch();
    new MutationObserver(records=>{for(const record of records){if(record.type==='attributes'&&helpMode==='off'&&record.target.title){record.target.dataset.savedHelp=record.target.title;record.target.removeAttribute('title');}}for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node!==tip)annotate(node);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['title']});
}
