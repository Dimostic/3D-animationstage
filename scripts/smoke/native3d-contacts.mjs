import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNode,demoProject,validateProject,seatBlend,attachmentActive,VERSION} from '../../js/native3d/project.mjs';

export async function checkNativeContacts(page){
    const p=demoProject(),a=p.nodes.find(n=>n.preset==='amaka'),b=p.nodes.find(n=>n.preset==='tunde'),doc=p.nodes.find(n=>n.kind==='document');
    const group=createNode('group',{name:'Contact group',position:[2,.15,-1],rotation:[0,.7,0],scale:[1.1,1.1,1.1]});
    p.nodes.push(group);for(const n of p.nodes.filter(n=>['character','chair','document'].includes(n.kind)))n.parent=group.id;
    for(const actor of [a,b])actor.seat={...actor.seat,start:1,sitDuration:1,standAt:4,standDuration:1};
    doc.attachment={actorId:a.id,hand:'left',start:.5,end:4.5};a.gaze='document';a.action={name:'wave',start:0,duration:6};
    validateProject(p);
    const legacy=structuredClone(p);legacy.version=1;legacy.nodes.forEach(n=>{delete n.seat;delete n.attachment;});assert.equal(validateProject(legacy).version,VERSION);
    const future=structuredClone(p);future.version=999;assert.throws(()=>validateProject(future),/supported/);
    const broken=structuredClone(p);broken.nodes.find(n=>n.seat).seat.chairId='missing';assert.throws(()=>validateProject(broken),/available chair/);
    const duplicate=structuredClone(p);duplicate.nodes.find(n=>n.preset==='tunde').seat.chairId=a.seat.chairId;assert.throws(()=>validateProject(duplicate),/only one/);
    const overlap=structuredClone(p);overlap.nodes.push(createNode('document',{attachment:{...doc.attachment,hand:'right'}}));assert.throws(()=>validateProject(overlap),/one object/);
    const tilted=structuredClone(p);tilted.nodes.find(n=>n.kind==='chair').rotation[0]=.2;assert.throws(()=>validateProject(tilted),/upright/);
    assert.equal(seatBlend(a.seat,0),0);assert.equal(seatBlend(a.seat,3),1);assert.equal(seatBlend(a.seat,5),0);
    assert.equal(attachmentActive(doc,.49),false);assert.equal(attachmentActive(doc,.5),true);assert.equal(attachmentActive(doc,4.5),false);
    const result=await page.evaluate(async p=>{
        await Native3D.install(p);const world=Native3D.world,actors=Native3D.project.nodes.filter(n=>n.kind==='character'),doc=Native3D.project.nodes.find(n=>n.kind==='document');
        let cases=0,maxSeat=0,maxFloor=0,maxGrip=0;
        for(const actor of actors)for(const outfit of [0,1])for(const yaw of [-180,-135,-90,-45,0,45,90,135])for(const height of [.9,1,1.1])for(const scale of [.9,1.1]){
            const chair=Native3D.project.nodes.find(n=>n.id===actor.seat.chairId);actor.outfit=outfit;actor.rotation[1]=yaw*Math.PI/180;chair.rotation[1]=actor.rotation[1]+.35;actor.scale=[scale,scale,scale];chair.scale=[1,height,1];
            doc.attachment.actorId=actor.id;
            for(const hand of ['left','right']){
                doc.attachment.hand=hand;world.seek(3);
                const contact=world.entries.get(actor.id).actor.contact(),hold=world.attachmentChecks.find(c=>c.id===doc.id);
                if(!contact||!hold)throw Error('Native contact/ownership was not resolved');
                maxSeat=Math.max(maxSeat,contact.error);maxFloor=Math.max(maxFloor,...contact.soles.map(y=>Math.abs(y-contact.floor)));maxGrip=Math.max(maxGrip,hold.error);
                if(contact.error>5e-5||contact.soles.some(y=>Math.abs(y-contact.floor)>5e-5)||hold.error>1e-6)throw Error('Native contact tolerance exceeded: '+JSON.stringify({id:actor.preset,outfit,yaw,height,scale,hand,contact,hold}));
                const entry=world.entries.get(actor.id),direction=entry.actor.group.children[0].children[0].getWorldDirection(world.camera.position.clone()),target=world.entries.get(chair.id).root.getWorldDirection(world.camera.position.clone());
                if(direction.dot(target)<1-1e-6)throw Error('Seated actor facing does not match chair');
                cases++;
            }
        }
        let duplicates=0;world.content.traverse(o=>{if(['ContactChair','HeldDocument'].includes(o.name))duplicates++;});if(duplicates)throw Error('Native contacts created hidden legacy prop copies');
        // Restore the demonstration, then compare repeat and reverse seeks.
        await Native3D.install(p);const actor=Native3D.project.nodes.find(n=>n.preset==='amaka');
        const samples=[];
        for(const t of [0,.5,1.3,2,3,4.3,4.5,5,3,1.3]){world.seek(t);samples.push({time:t,seat:world.entries.get(actor.id).actor.contact(),hold:world.attachmentChecks[0]||null});}
        const equalPose=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<1e-9:a&&b&&typeof a==='object'&&typeof b==='object'?Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>equalPose(a[k],b[k])):a===b;
        if(!equalPose(samples[4],samples[8]))throw Error('Reverse seat/hold seek differs');
        if(!equalPose(samples[2],samples[9]))throw Error('Reverse transition seek differs');
        if(samples[0].hold||!samples[1].hold||samples[6].hold)throw Error('Document ownership range boundaries failed');
        const document=Native3D.project.nodes.find(n=>n.kind==='document');world.seek(3);
        const chair=Native3D.project.nodes.find(n=>n.id===actor.seat.chairId),before=world.entries.get(actor.id).actor.contact().point;
        chair.position[0]+=.4;world.seek(3);const moved=world.entries.get(actor.id).actor.contact();if(moved.error>5e-5||Math.hypot(moved.point[0]-before[0],moved.point[2]-before[2])<.3)throw Error('Seated actor did not follow independent chair');
        chair.position[0]-=.4;
        const grips=[];for(const t of [2.2,2.5,2.8,3.1]){world.seek(t);grips.push(world.attachmentChecks[0].grip);}
        if(grips.some(p=>Math.hypot(...p.map((v,i)=>v-grips[0][i]))>1e-5))throw Error('Wave moved the reserved document hand');
        const state=JSON.parse(JSON.stringify(Native3D.project));await Native3D.install(state);world.seek(3);if(!world.attachmentChecks.length||world.entries.get(actor.id).actor.contact().error>5e-5)throw Error('Save/reopen lost contacts');
        Native3D.select(document.id);return {cases,maxSeat,maxFloor,maxGrip,documentId:document.id,actorId:actor.id,chairId:actor.seat.chairId,samples};
    },p);
    fs.writeFileSync('tmp/native3d-contact-checks.json',JSON.stringify(result,null,2));
    await page.setViewportSize({width:1500,height:1000});
    if(await page.locator('#camera-view').getAttribute('aria-pressed')==='true')await page.click('#camera-view');
    await page.screenshot({path:'tmp/native3d-contacts.png'});
    assert.equal(await page.locator('[name=position0]').isDisabled(),true,'Held props should be moved through their owner, not a misleading transform');
    const before=await page.evaluate(()=>Native3D.world.entries.get(Native3D.project.nodes.find(n=>n.kind==='document').id).root.matrixWorld.toArray());
    await page.click('#detach-document');await page.waitForFunction(()=>!Native3D.project.nodes.find(n=>n.kind==='document').attachment);
    const after=await page.evaluate(()=>Native3D.world.entries.get(Native3D.project.nodes.find(n=>n.kind==='document').id).root.matrixWorld.toArray());
    assert.ok(before.every((v,i)=>Math.abs(v-after[i])<1e-6),'Detaching changed the document pose');
    await page.click('#undo');await page.waitForFunction(()=>!!Native3D.project.nodes.find(n=>n.kind==='document').attachment);
    // UI changes are drafts until Apply, and document target/hand controls persist.
    await page.selectOption('[name=holdHand]','right');assert.equal(await page.evaluate(()=>Native3D.project.nodes.find(n=>n.kind==='document').attachment.hand),'left');
    await page.locator('#object-form [type=submit]').click();await page.waitForFunction(()=>Native3D.project.nodes.find(n=>n.kind==='document').attachment.hand==='right');
    await page.evaluate(id=>Native3D.select(id),result.chairId);await page.click('#delete');await page.waitForFunction(id=>!Native3D.project.nodes.some(n=>n.id===id),result.chairId);
    assert.equal(await page.evaluate(id=>!!Native3D.project.nodes.find(n=>n.id===id).seat,result.actorId),false,'Deleting a chair left a broken seat reference');
    await page.click('#undo');await page.waitForFunction(id=>!!Native3D.project.nodes.find(n=>n.id===id).seat,result.actorId);
    console.log(`PASS native contacts: ${result.cases} rig/outfit/view/height/scale/hand cases; timed ownership, reserved hand, grouped/moving chair contact, reverse seeks, detach/undo and reference cleanup`);
}
