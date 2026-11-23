import assert from 'node:assert/strict';
export async function checkSeatedStance(page){
    const result=await page.evaluate(async()=>{
        const p=JSON.parse(JSON.stringify(Native3D.project)),actor=p.nodes.find(n=>n.preset==='amaka'),chair=p.nodes.find(n=>n.id===actor.seat?.chairId);
        if(!chair)throw Error('Seat regression needs the classroom example');actor.gaze='manual';delete actor.actionClips;actor.rotation=[0,0,0];actor.position=[0,0,0];actor.seat={chairId:chair.id,start:1,sitDuration:1,standAt:5,standDuration:1};chair.position=[0,0,-.6];chair.rotation=[0,0,0];
        for(const n of p.nodes)if(n.attachment)delete n.attachment;await Native3D.install(p);const w=Native3D.world,e=w.entries.get(actor.id),a=e.node,c=w.entries.get(chair.id).node;
        const garment=e.actor.bone('Outfit1').geometry,topology={vertices:garment.attributes.position.count,indices:garment.index?.count,position:Array.from(garment.attributes.position.array)},samples=[];
        const point=name=>e.root.worldToLocal(e.actor.bone(name).getWorldPosition(w.camera.position.clone()));
        let maxKnee=0,maxAnkle=0,maxSeat=0,maxFloor=0;
        for(const outfit of [0,1])for(const height of [.9,1,1.1])for(const yaw of [0,.7,-1.4]){a.outfit=outfit;c.scale=[1,height,1];a.rotation[1]=yaw;c.rotation[1]=yaw;
            for(const t of [0,1.01,1.3,1.7,2,3,5.3,5.9,6,3]){w.seek(t);const contact=e.actor.contact();if(contact?.sitting>0){maxSeat=Math.max(maxSeat,contact.error);maxFloor=Math.max(maxFloor,...contact.soles.map(v=>Math.abs(v-contact.floor)));}if(t===3){const left=point('lowerleg01_L'),right=point('lowerleg01_R'),fl=point('foot_L'),fr=point('foot_R'),axis=w.camera.position.clone().set(Math.cos(yaw),0,-Math.sin(yaw));const knees=Math.abs(left.clone().sub(right).dot(axis)),ankles=Math.abs(fl.clone().sub(fr).dot(axis));maxKnee=Math.max(maxKnee,knees);maxAnkle=Math.max(maxAnkle,ankles);samples.push({outfit,height,yaw,knees,ankles});}}
        }
        const unchanged=topology.vertices===garment.attributes.position.count&&topology.indices===garment.index?.count&&topology.position.every((v,i)=>v===garment.attributes.position.array[i]);
        // Standalone Sit uses the same closed-leg intent without inventing a chair.
        delete a.seat;a.rotation=[0,0,0];a.action={name:'sit',start:0,duration:1};w.seek(2);const standalone=Math.abs(point('lowerleg01_L').x-point('lowerleg01_R').x);
        a.seat={chairId:chair.id,start:1,sitDuration:1,standAt:5,standDuration:1};c.scale=[1,1,1];c.rotation=[0,0,0];a.outfit=1;w.seek(3);for(const entry of w.entries.values())if(![a.id,chair.id].includes(entry.node.id)&&!['plane','light'].includes(entry.node.kind))entry.root.visible=false;w.helpers.visible=false;w.camera.position.set(0,1.05,2.6);w.orbit.target.set(0,.82,0);w.orbit.update();
        return {maxKnee,maxAnkle,maxSeat,maxFloor,unchanged,standalone,samples};
    });assert.ok(result.maxKnee<.125,JSON.stringify(result));assert.ok(result.maxAnkle<.12);assert.ok(result.maxSeat<5e-5);assert.ok(result.maxFloor<5e-5);assert.equal(result.unchanged,true);assert.ok(result.standalone<.13);
    await page.click('#stage-focus');await page.screenshot({path:'tmp/native3d-seated-together.png'});await page.evaluate(()=>{const w=Native3D.world;w.camera.position.set(1.7,1.05,2.1);w.orbit.update();});await page.screenshot({path:'tmp/native3d-seated-together-side.png'});await page.click('#stage-focus');console.log('PASS seated stance: knees/ankles together, both outfits/chair heights/facings, sit/stand/reverse seeks, seat/sole contact, standalone Sit and unchanged skirt topology');
}
