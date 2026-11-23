import {analyseSpeech,clipDuration} from './speech.mjs';
import {demoProject} from './project.mjs';
import {createTTSUI} from './tts-ui.mjs';
const $=s=>document.querySelector(s);
const texts=[
    'Good morning, Tunde. Shall we review the lesson plan together?',
    'Good morning, Amaka. Yes. The practical activity on this page should help our students.'
];
export function createSpeechUI({getProject,getWorld,getSelected,change,install,status,busy}){
    let signature='',captionKey='',preparing=false;
    const fail=error=>status(error.message||String(error),true);
    function bind(id,fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(fail));}
    async function prepare(work){if(preparing||busy())return;preparing=true;document.querySelector('header').inert=true;document.querySelector('main').inert=true;$('.projectbar').inert=true;$('#loading').hidden=false;$('#import-speech').disabled=true;$('#conversation-example').disabled=true;
        try{return await work();}finally{preparing=false;document.querySelector('header').inert=false;document.querySelector('main').inert=busy();$('.projectbar').inert=busy();$('#loading').hidden=!busy();$('#import-speech').disabled=false;$('#conversation-example').disabled=false;}
    }
    function actorOptions(select,value){select.replaceChildren(new Option('Narration / no character',''));for(const n of getProject().nodes.filter(n=>n.kind==='character'))select.add(new Option(n.name,n.id));select.value=value||'';}
    function captionRow(container,cap,duration){
        const row=document.createElement('div');row.className='caption-row';row.innerHTML='<label>Caption text<textarea name="captionText" rows="2" maxlength="5000"></textarea></label><details><summary>Caption timing (original audio seconds)</summary><div class="paired"><label>From<input name="captionStart" type="number" min="0" step="0.01" required></label><label>To<input name="captionEnd" type="number" min="0.01" step="0.01" required></label></div></details><button type="button" data-remove-caption>Remove caption</button>';
        row.querySelector('textarea').value=cap.text;row.querySelector('[name=captionStart]').value=Number(cap.start.toFixed(3));row.querySelector('[name=captionEnd]').value=Number(cap.end.toFixed(3));
        row.querySelectorAll('input').forEach(el=>el.step='any');
        row.querySelectorAll('input').forEach(el=>el.max=duration+.001);row.querySelector('[data-remove-caption]').onclick=()=>row.remove();container.append(row);
    }
    function refresh(){const p=getProject();if(!p)return;
        $('#speech-count').textContent=`· ${p.speech.length} ${p.speech.length===1?'clip':'clips'}`;$('#captions-enabled').checked=p.captionSettings.enabled;$('#caption-speakers').checked=p.captionSettings.showSpeaker;
        const next=JSON.stringify(p.speech);
        if(next===signature){for(const form of document.querySelectorAll('.speech-form')){actorOptions(form.elements.actorId,form.elements.actorId.value);const c=p.speech.find(c=>c.id===form.closest('details').dataset.id);if(c)form.closest('details').querySelector('summary').textContent=`${p.nodes.find(n=>n.id===c.actorId)?.name||'Narration'} · ${c.start.toFixed(2)}–${(c.start+clipDuration(c)).toFixed(2)} s · ${c.name}`;}return;}
        const open=new Set([...document.querySelectorAll('.speech-clip[open]')].map(el=>el.dataset.id));signature=next;const list=$('#speech-list');list.replaceChildren();
        for(const clip of p.speech){const asset=p.assets[clip.assetId],details=document.createElement('details');details.className='speech-clip';details.dataset.id=clip.id;details.open=open.has(clip.id)||p.speech.length===1;
            const summary=document.createElement('summary'),speaker=p.nodes.find(n=>n.id===clip.actorId)?.name||'Narration';summary.textContent=`${speaker} · ${clip.start.toFixed(2)}–${(clip.start+clipDuration(clip)).toFixed(2)} s · ${clip.name}`;details.append(summary);
            const form=document.createElement('form');form.className='speech-form';form.innerHTML='<div class="speech-basics"><label>Speaker<select name="actorId"></select></label><label>Start (scene s)<input name="start" type="number" min="0" max="600" step="0.01" required></label></div><label>Performance<select name="performance"><option value="mouth">Lip sync only</option><option value="performance">Lip sync &amp; gentle gestures</option></select></label><div data-caption-rows></div><button type="button" data-add-caption>Add caption segment</button><details><summary>Trim &amp; sound</summary><div class="paired"><label>Audio in (s)<input name="sourceStart" type="number" min="0" step="0.001" required></label><label>Audio out (s)<input name="sourceEnd" type="number" min="0.01" step="0.001" required></label></div><label>Volume<input name="volume" type="range" min="0" max="1" step="0.05"></label><label><input name="muted" type="checkbox"> Mute recording</label><p class="hint">Caption times refer to the original recording. Trimming hides captions outside the chosen audio range. Muting changes sound, not lip sync.</p></details><div class="speech-actions"><button type="submit" class="primary">Apply Speech</button><button type="button" data-go>Go to Start</button><button type="button" data-delete>Delete Speech</button></div>';
            const f=form.elements;actorOptions(f.actorId,clip.actorId);f.start.value=Number(clip.start.toFixed(3));f.sourceStart.value=clip.sourceStart;f.sourceEnd.value=clip.sourceEnd;f.volume.value=clip.volume;f.muted.checked=clip.muted;f.performance.value=clip.performance?'performance':'mouth';
            form.querySelectorAll('input[type=number]').forEach(el=>el.step='any');
            const rows=form.querySelector('[data-caption-rows]');for(const cap of clip.captions.length?clip.captions:[{start:0,end:asset.duration,text:''}])captionRow(rows,cap,asset.duration);
            form.querySelector('[data-add-caption]').onclick=()=>{const last=rows.lastElementChild;if(!last){captionRow(rows,{start:0,end:asset.duration,text:''},asset.duration);return;}const from=last.querySelector('[name=captionStart]'),to=last.querySelector('[name=captionEnd]');let start=Number(to.value);if(start>=asset.duration-.01){start=(Number(from.value)+Number(to.value))/2;to.value=Number(start.toFixed(3));}captionRow(rows,{start,end:asset.duration,text:''},asset.duration);};
            form.querySelector('[data-go]').onclick=()=>{getWorld().stop();getWorld().seek(clip.start);};
            form.querySelector('[data-delete]').onclick=()=>change(next=>{next.speech=next.speech.filter(c=>c.id!==clip.id);if(!next.speech.some(c=>c.assetId===clip.assetId))delete next.assets[clip.assetId];}).catch(fail);
            form.onsubmit=event=>{event.preventDefault();const draft={actorId:f.actorId.value||null,start:Number(f.start.value),sourceStart:Number(f.sourceStart.value),sourceEnd:Number(f.sourceEnd.value),volume:Number(f.volume.value),muted:f.muted.checked,performance:f.performance.value==='performance',captions:[...rows.children].map(row=>({start:Number(row.querySelector('[name=captionStart]').value),end:Number(row.querySelector('[name=captionEnd]').value),text:row.querySelector('textarea').value.trim()})).filter(c=>c.text).sort((a,b)=>a.start-b.start)};
                change(next=>{Object.assign(next.speech.find(c=>c.id===clip.id),draft);next.duration=Math.max(next.duration,draft.start+draft.sourceEnd-draft.sourceStart);}).catch(fail);
            };details.append(form);list.append(details);
        }
    }
    function renderCaptions(){const world=getWorld();if(!world?.project)return;const settings=world.project.captionSettings,entries=world.captionEntries||[],key=JSON.stringify([settings,entries]);if(key===captionKey)return;captionKey=key;const overlay=$('#captions');overlay.replaceChildren();overlay.hidden=!settings.enabled||!entries.length;
        for(const c of entries.slice(0,4)){const line=document.createElement('div');line.textContent=(settings.showSpeaker?c.speaker+': ':'')+c.text;overlay.append(line);}
    }
    async function assetFromBytes(bytes,name,mime){const buffer=await getWorld().audio.decode(bytes);if(buffer.duration>=.01&&buffer.duration<=600){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read audio'));reader.readAsDataURL(new Blob([bytes],{type:mime}));});return {type:'audio',name:name.slice(0,160),data,duration:buffer.duration,cues:analyseSpeech(buffer)};}throw Error('Choose a recording between 0.01 seconds and 10 minutes');}
    bind('#import-speech',()=>{if(!busy())$('#speech-file').click();});
    $('#speech-file').onchange=async event=>{const file=event.target.files[0];event.target.value='';if(!file||busy())return;
        try{await prepare(async()=>{getWorld().stop();const original=getProject(),selected=original.nodes.find(n=>n.id===getSelected()&&n.kind==='character'),start=Math.max(getWorld().time,...original.speech.filter(c=>c.actorId===(selected?.id||null)).map(c=>c.start+clipDuration(c)));status('Decoding recording and estimating mouth movement…');if(file.size>20*1024*1024)throw Error('Choose an audio file smaller than 20 MB');const mime=({wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',webm:'audio/webm',m4a:'audio/mp4',mp4:'audio/mp4'})[file.name.split('.').at(-1).toLowerCase()];if(!mime)throw Error('Choose WAV, MP3, OGG, WebM or M4A audio');const asset=await assetFromBytes(await file.arrayBuffer(),file.name,mime),id=crypto.randomUUID();
            if(getProject()!==original||busy())throw Error('Scene changed while decoding. Import the recording again.');if(start+asset.duration>600)throw Error('Move the timeline earlier or shorten the recording to keep the scene under 10 minutes');
            await change(p=>{p.assets[id]=asset;p.speech.push({id:crypto.randomUUID(),assetId:id,actorId:selected?.id||null,name:file.name.slice(0,160),start,sourceStart:0,sourceEnd:asset.duration,volume:1,muted:false,performance:false,captions:[]});p.duration=Math.max(p.duration,start+asset.duration);});$('#speech-panel').open=true;status('Recording added. Choose its speaker and type captions, then Apply Speech.');});
        }catch(error){fail(error);}
    };
    for(const [id,key]of [['#captions-enabled','enabled'],['#caption-speakers','showSpeaker']])$(id).onchange=()=>{const value=$(id).checked;change(p=>p.captionSettings[key]=value).catch(fail);};
    bind('#conversation-example',async()=>{if(busy()||!confirm('Open the voiced Teacher & Colleague scene? Save your current project first.'))return;return prepare(async()=>{const original=getProject();getWorld().stop();status('Loading the conversation recordings…');const p=demoProject();p.name='Teacher & Colleague • native conversation';p.speech=[];
        let start=5;
        for(const [i,id]of ['amaka','tunde'].entries()){const response=await fetch(new URL(`audio/${id}.wav`,document.baseURI));if(!response.ok)throw Error('Example audio missing; rebuild the local app');const asset=await assetFromBytes(await response.arrayBuffer(),`${id}.wav`,'audio/wav'),assetId=crypto.randomUUID(),actor=p.nodes.find(n=>n.preset===id);p.assets[assetId]=asset;
            p.speech.push({id:crypto.randomUUID(),assetId,actorId:actor.id,name:i?'Colleague reply':'Teacher greeting',start,sourceStart:0,sourceEnd:asset.duration,volume:1,muted:false,performance:true,captions:[{start:0,end:asset.duration,text:texts[i]}]});actor.seat.standAt=null;start+=asset.duration+.7;
        }p.duration=start+1;if(getProject()!==original||busy())throw Error('Scene changed while loading. Open the example again.');await install(p,{reset:true});$('#speech-panel').open=true;status('Voiced conversation ready. Press Play to hear both speakers and see linked captions.');});
    });
    createTTSUI({getProject,getWorld,getSelected,change,assetFromBytes,prepare,status,busy});
    return {refresh,renderCaptions};
}
