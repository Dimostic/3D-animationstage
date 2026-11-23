import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyseSpeech,speechAt,speechFrame} from '../../js/native3d/speech.mjs';
import {createProject,createNode,validateProject} from '../../js/native3d/project.mjs';
export async function checkNativeSpeech(page){
    const samples=new Float32Array(16000);for(let i=1600;i<14000;i++)samples[i]=Math.sin(i/8000*Math.PI*360)*(.15+.1*Math.sin(i/1500));
    const buffer={sampleRate:8000,length:samples.length,duration:2,numberOfChannels:1,getChannelData:()=>samples},cues=analyseSpeech(buffer);
    assert.ok(cues.some(c=>c.viseme!=='rest'&&c.strength>.2));assert.ok(analyseSpeech({...buffer,getChannelData:()=>new Float32Array(samples.length)}).every(c=>c.viseme==='rest'));
    assert.equal(speechFrame({duration:2,cues},2),null);
    const p=createProject(),actor=createNode('character',{preset:'amaka'});p.nodes=[actor];p.assets.a={type:'audio',name:'Synthetic',duration:2,cues,data:'data:audio/wav;base64,AA=='};p.speech=[{id:'line',name:'Line',assetId:'a',actorId:actor.id,start:1,sourceStart:0,sourceEnd:2,volume:1,muted:false,performance:false,captions:[{start:0,end:2,text:'Linked caption'}]}];
    validateProject(p);assert.equal(speechAt(p,.9).captions.length,0);assert.equal(speechAt(p,1.5).captions[0].text,'Linked caption');assert.equal(speechAt(p,3).frames.size,0);
    const overlap=structuredClone(p);overlap.speech.push({...overlap.speech[0],id:'other'});assert.throws(()=>validateProject(overlap),/cannot overlap/);
    const capOverlap=structuredClone(p);capOverlap.speech[0].captions.push({start:1,end:2,text:'overlap'});assert.throws(()=>validateProject(capOverlap),/non-overlapping/);
    const old=structuredClone(p);old.version=2;delete old.speech;delete old.captionSettings;assert.deepEqual(validateProject(old).speech,[]);
    const trim=structuredClone(p);trim.speech[0].sourceStart=.2;trim.speech[0].sourceEnd=1.5;assert.equal(speechAt(trim,2.31).frames.size,0);assert.deepEqual(speechAt(trim,1).frames.get(actor.id),speechFrame(trim.assets.a,.2,false));
    trim.captionSettings.enabled=false;assert.equal(speechAt(trim,1.5).captions.length,0);assert.equal(speechAt(trim,1.5).frames.size,1);
    const pair=structuredClone(p),listener=createNode('character',{preset:'tunde'});pair.nodes.push(listener);pair.speech.push({...pair.speech[0],id:'reply',actorId:listener.id});validateProject(pair);assert.equal(speechAt(pair,1.5).captions.length,2);
    page.once('dialog',d=>d.accept());await page.click('#conversation-example');
    await page.waitForFunction(()=>Native3D.project.speech.length===2,null,{timeout:60000});
    const checks=await page.evaluate(()=>{
        const w=Native3D.world,p=Native3D.project,[a,b]=p.speech;
        function sample(time){w.seek(time);return {time,captions:w.captionEntries.map(c=>c.text),mouths:p.nodes.filter(n=>n.kind==='character').map(n=>({id:n.id,jaw:w.entries.get(n.id).actor.bone('jaw').rotation.x})),holds:w.attachmentChecks.map(c=>c.error),seats:p.nodes.filter(n=>n.seat).map(n=>w.entries.get(n.id).actor.contact()?.error)};}
        const source=p.assets[a.assetId].cues.filter(c=>c.viseme!=='rest'&&c.viseme!=='MBP').sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0],time=a.start+source.start+.03;
        const first=sample(time),neutral=sample(0),second=sample(b.start+.8),reverse=sample(time);
        if(JSON.stringify(first)!==JSON.stringify(reverse))throw Error('Speech depends on previous seek');
        if(!first.mouths.some(m=>m.id===a.actorId&&m.jaw>.001)||first.mouths.some(m=>m.id!==a.actorId&&m.jaw!==0))throw Error('Speaker/listener mouth isolation failed');
        if(neutral.mouths.some(m=>m.jaw!==0)||neutral.captions.length)throw Error('Speech/captions did not reset');
        if(!first.captions.length||!second.captions.length||first.holds.some(e=>e>1e-6)||first.seats.some(e=>e>5e-5))throw Error('Speech broke captions/hand/seat contact');
        return {first,neutral,second,reverse,time,firstId:a.id,actorId:a.actorId,assetId:a.assetId,versions:p.version};
    });
    fs.writeFileSync('tmp/native3d-speech-checks.json',JSON.stringify(checks,null,2));
    await page.screenshot({path:'tmp/native3d-speech.png'});
    // All edits remain drafts until Apply; start moves speech and captions together.
    const editor=page.locator(`.speech-clip[data-id="${checks.firstId}"]`);await editor.evaluate(el=>el.open=true);
    await editor.locator('[name=start]').fill('6');assert.equal(await page.evaluate(()=>Native3D.project.speech[0].start),5);
    await editor.locator('[type=submit]').click();await page.waitForFunction(()=>Native3D.project.speech[0].start===6);
    assert.equal(await page.evaluate(()=>{Native3D.world.seek(5.2);return Native3D.world.captionEntries.length;}),0);
    assert.equal(await page.evaluate(()=>{Native3D.world.seek(6.2);return Native3D.world.captionEntries.length;}),1);
    // Recordings play through a real Web Audio graph, with the audio clock driving scene time.
    await page.evaluate(()=>Native3D.world.seek(Native3D.project.speech[0].start+.2));await page.click('#play');
    await page.waitForFunction(()=>Native3D.world.playing&&Native3D.world.audio.context.state==='running'&&Native3D.world.audio.sources.size>0);
    const audible=await page.evaluate(async()=>{const world=Native3D.world,audio=world.audio,gain=[...audio.sources.values()][0],meter=audio.context.createAnalyser();meter.fftSize=2048;gain.connect(meter);let peak=0;for(let i=0;i<8;i++){await new Promise(resolve=>setTimeout(resolve,80));const pcm=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(pcm);peak=Math.max(peak,...pcm.map(Math.abs));}gain.disconnect(meter);meter.disconnect();return {peak,clockSample:world.clockSample,sceneTime:world.time,renderLag:audio.time()-world.time};});
    assert.ok(audible.peak>.0001,'Scheduled recording produced no measurable audio');assert.notEqual(audible.clockSample.audioTime,null);assert.ok(Math.abs(audible.clockSample.audioTime-audible.sceneTime)<.001,'Scene did not use its sampled audio clock');
    fs.writeFileSync('tmp/native3d-audio-output.json',JSON.stringify(audible,null,2));
    await page.click('#play');assert.equal(await page.evaluate(()=>Native3D.world.audio.sources.size),0,'Pause left live audio sources');
    const save=page.waitForEvent('download');await page.click('#save');await(await save).saveAs('tmp/native3d-voiced.stage3d');
    const saved=JSON.parse(fs.readFileSync('tmp/native3d-voiced.stage3d'));assert.equal(saved.speech.length,2);assert.ok(saved.assets[checks.assetId].data.startsWith('data:audio/'));
    await page.evaluate(async()=>{const p=JSON.parse(JSON.stringify(Native3D.project));const first=p.speech[0];first.sourceStart=.2;first.sourceEnd-=.2;first.muted=true;await Native3D.install(p);});
    page.once('dialog',d=>d.accept());await page.locator('#project-file').setInputFiles('tmp/native3d-voiced.stage3d');await page.waitForFunction(()=>Native3D.project.speech[0].muted===false);
    const stable=await page.evaluate(async()=>{const world=Native3D.world,p=Native3D.project,buffer=world.audio.buffers.get(p.speech[0].assetId),next=JSON.parse(JSON.stringify(p));await Native3D.install(next);return world.audio.buffers.get(p.speech[0].assetId)===buffer;});assert.equal(stable,true,'Unchanged recordings were unnecessarily decoded again');
    // Bad encoded data must preserve the current scene and its playable assets.
    const transactional=await page.evaluate(async()=>{const before=Native3D.project,next=JSON.parse(JSON.stringify(before));next.assets.bad={type:'audio',name:'Bad',duration:1,data:'data:audio/wav;base64,AA==',cues:[]};next.speech.push({...next.speech[0],id:'bad',actorId:null,assetId:'bad',start:0,sourceStart:0,sourceEnd:1,captions:[]});try{await Native3D.install(next);return false;}catch{return Native3D.project===before&&Native3D.world.project===before;}});assert.equal(transactional,true);
    // Local file import chooses the selected character and appends after its existing speech.
    await page.evaluate(id=>Native3D.select(id),checks.actorId);await page.locator('#speech-file').setInputFiles('examples/teacher-colleague/audio/amaka.wav');
    await page.waitForFunction(()=>Native3D.project.speech.length===3,null,{timeout:60000});assert.equal(await page.evaluate(id=>Native3D.project.speech[2].actorId===id,checks.actorId),true);
    const imported=await page.evaluate(()=>Native3D.project.speech.at(-1).id);const importEditor=page.locator(`.speech-clip[data-id="${imported}"]`);await importEditor.evaluate(el=>el.open=true);
    await importEditor.locator('textarea').fill('Imported speech caption');await importEditor.locator('[type=submit]').click();await page.waitForFunction(()=>Native3D.project.speech[2].captions.length===1);
    // Removing a 3D prop must not delete unrelated audio assets.
    await page.evaluate(()=>Native3D.select(Native3D.project.nodes.find(n=>n.kind==='table').id));await page.click('#delete');assert.equal(await page.evaluate(()=>Native3D.project.speech.every(c=>!!Native3D.project.assets[c.assetId])),true);
    await page.evaluate(()=>{Native3D.world.seek(Native3D.project.speech[0].start+.8);});await page.selectOption('#export-type','png');const png=page.waitForEvent('download');await page.click('#export');await(await png).saveAs('tmp/native3d-captioned.png');
    console.log('PASS native speech: local analysis/import, audible Web Audio output, clock sync, speaker isolation, chair/hand priority, captions, moving/trimmed clips, reverse seeks, save/reopen, decoder reuse and transactional failure');
}
