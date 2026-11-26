// Audio analysis and rig visemes reuse the established 3D pilot semantics.
// This module has no editor-shell, SVG-character or hosted-service dependency.
export const VISEMES={
    rest:{jaw:0,wide:0,round:0,press:0,upper:0,lower:0},
    MBP:{jaw:0,wide:-.04,round:0,press:.88,upper:-.04,lower:-.05},
    FV:{jaw:.12,wide:.12,round:0,press:.2,upper:.1,lower:.08},
    L:{jaw:.25,wide:.1,round:.03,press:0,upper:.13,lower:.42},
    A:{jaw:.78,wide:.18,round:.04,press:0,upper:.22,lower:.86},
    E:{jaw:.4,wide:.72,round:0,press:0,upper:.12,lower:.36},
    O_U:{jaw:.55,wide:-.5,round:.9,press:.03,upper:.2,lower:.56}
};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const clipDuration=c=>c.sourceEnd-c.sourceStart;
export function analyseSpeech(buffer){
    const rate=buffer.sampleRate,hop=Math.max(32,Math.round(rate*.02)),size=Math.round(rate*.024),channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
    const frames=[];let low=0,fast=0;
    for(let offset=0;offset<buffer.length;offset+=hop){let sum=0,cross=0,lo=0,hi=0,previous=0;const end=Math.min(buffer.length,offset+size);
        for(let i=offset;i<end;i++){const sample=channels.reduce((n,c)=>n+c[i],0)/channels.length;sum+=sample*sample;if((sample>=0)!==(previous>=0))cross++;previous=sample;low+=.055*(sample-low);fast+=.28*(sample-fast);lo+=low*low;hi+=(sample-fast)**2+.55*(fast-low)**2;}
        frames.push({start:offset/rate,end:Math.min(buffer.duration,(offset+hop)/rate),rms:Math.sqrt(sum/Math.max(1,end-offset)),zcr:cross/Math.max(1,end-offset),ratio:hi/Math.max(1e-8,lo)});
    }
    const levels=frames.map(f=>f.rms).sort((a,b)=>a-b),peak=levels[Math.floor((levels.length-1)*.96)]||0,noise=Math.min(levels[Math.floor((levels.length-1)*.18)]||0,peak*.2);
    const cues=[];let energy=0,last='rest',candidate='rest',votes=0;
    for(const frame of frames){const target=peak<.0002?0:clamp((frame.rms-noise)/Math.max(.001,peak-noise));const previous=energy;energy+=(target-energy)*(target>energy?.65:.3);let viseme='rest';
        if(energy>.04){if(energy-previous>.25&&last==='rest')viseme='MBP';else if(frame.zcr>.19||frame.ratio>5.5)viseme='FV';else if(frame.ratio>2.1)viseme='E';else if(frame.ratio<.58&&energy<.72)viseme='O_U';else viseme=energy>.52?'A':'L';}
        if(candidate===viseme)votes++;else{candidate=viseme;votes=1;}if(viseme==='rest'||viseme==='MBP'||last==='rest'||votes>=2)last=viseme;
        const strength=last==='rest'?0:clamp(energy*1.2,.2,1.2),prior=cues.at(-1);
        if(prior&&prior.viseme===last&&Math.abs(prior.strength-strength)<.08){prior.end=frame.end;prior.strength=(prior.strength+strength)/2;}
        else cues.push({start:frame.start,end:frame.end,viseme:last,strength});
    }
    return cues;
}
export function speechFrame(asset,time,performance=false){
    if(time<0||time>=asset.duration)return null;
    const cues=asset.cues;let low=0,high=cues.length-1,index=-1;
    while(low<=high){const mid=(low+high)>>1;if(cues[mid].start<=time){index=mid;low=mid+1;}else high=mid-1;}
    const cue=cues[index];if(!cue||time>=cue.end)return {jaw:0,wide:0,round:0,press:0,upper:0,lower:0};
    const frame={};for(const key of Object.keys(VISEMES.rest))frame[key]=(VISEMES[cue.viseme][key]||0)*cue.strength;
    const before=cues[index-1],blend=clamp((time-cue.start)/.025);
    if(blend<1)for(const key of Object.keys(frame))frame[key]=(before&&before.end>=cue.start-.001?(VISEMES[before.viseme][key]||0)*before.strength:0)*(1-blend)+frame[key]*blend;
    const tail=clamp((asset.duration-time)/.04);for(const key of Object.keys(frame))frame[key]*=tail;
    frame.viseme=cue.viseme;frame.tongue=cue.viseme==='L'?cue.strength:0;
    if(performance){const e=clamp(frame.jaw*2);Object.assign(frame,{blink:Math.max(0,1-Math.abs((time%3.7)-3.5)/.1),nod:Math.sin(time*3)*.22*e,handA:Math.max(0,Math.sin(time*2.7))*.28*e,handB:Math.max(0,Math.sin(time*2.7+1.7))*.24*e,brow:.1*e,smile:.08*e});}
    return frame;
}
export function speechAt(project,time,solo=null){
    const frames=new Map(),captions=[];
    for(const clip of project.speech||[]){if(solo&&clip.id!==solo)continue;const local=time-clip.start;if(local<0||local>=clipDuration(clip))continue;
        const source=local+clip.sourceStart,asset=project.assets[clip.assetId];
        if(clip.actorId)frames.set(clip.actorId,speechFrame(asset,source,clip.performance));
        if(project.captionSettings.enabled)for(const cap of clip.captions)if(source>=cap.start&&source<cap.end){const actor=project.nodes.find(n=>n.id===clip.actorId);captions.push({clipId:clip.id,speaker:actor?.name||'Narration',text:captionText(cap,source,project.captionSettings)});}
    }return {frames,captions};
}
export function captionText(cap,time,settings){
    if(!settings.pacing||settings.pacing==='full')return cap.text;
    const words=cap.text.trim().split(/\s+/),chunks=settings.pacing==='sentence'?(cap.text.match(/[^.!?]+[.!?]*/g)||[cap.text]).map(s=>s.trim()).filter(Boolean):Array.from({length:Math.ceil(words.length/(settings.maxWords||5))},(_,i)=>words.slice(i*(settings.maxWords||5),(i+1)*(settings.maxWords||5)).join(' '));
    const total=chunks.reduce((n,s)=>n+s.split(/\s+/).length,0),at=Math.max(0,Math.min(.999999,(time-cap.start)/(cap.end-cap.start)))*total;let offset=0;for(const chunk of chunks){offset+=chunk.split(/\s+/).length;if(at<offset)return chunk;}return chunks.at(-1)||cap.text;
}
export function drawCaptions(ctx,width,height,captions,settings){
    if(!settings.enabled||!captions.length)return;const size=Math.max(12,Math.round(height*(settings.fontSize||28)/720)),lineHeight=size*1.35,maxWidth=width*.82,lines=[];
    ctx.font=`600 ${size}px sans-serif`;ctx.textBaseline='top';
    for(const c of captions.slice(0,4)){const text=(settings.showSpeaker?c.speaker+': ':'')+c.text;let line='';for(const word of text.split(/\s+/)){if(ctx.measureText(line+' '+word).width>maxWidth&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);}
    const visible=lines.slice(0,8);if(lines.length>8)visible[7]+='…';const boxHeight=visible.length*lineHeight+size*.8,x=width*.07,y=settings.position==='top'?height*.06:height-boxHeight-height*.06;
    ctx.fillStyle=settings.background||'rgba(10,18,28,.88)';ctx.fillRect(x,y,width*.86,boxHeight);ctx.fillStyle=settings.color||'#fff';ctx.textAlign='center';visible.forEach((line,i)=>ctx.fillText(line,width/2,y+size*.4+i*lineHeight,maxWidth));
}
export class SpeechPlayer{
    constructor(){this.context=null;this.buffers=new Map();this.assets={};this.sources=new Map();this.running=false;}
    getContext(){if(!this.context){const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('Audio playback needs a browser with Web Audio support');this.context=new Context();}return this.context;}
    async decode(data){return this.getContext().decodeAudioData(data.slice(0));}
    async prepare(project){const buffers=new Map();for(const id of new Set((project.speech||[]).map(c=>c.assetId))){const a=project.assets[id];if(this.assets[id]?.data===a.data&&this.buffers.has(id)){buffers.set(id,this.buffers.get(id));continue;}
        const raw=Uint8Array.from(atob(a.data.split(',')[1]),c=>c.charCodeAt(0)).buffer,buffer=await this.decode(raw);
        if(Math.abs(buffer.duration-a.duration)>.12)throw Error('Audio duration does not match the saved asset');buffers.set(id,buffer);
    }return buffers;}
    commit(project,buffers){this.stop();this.assets=project.assets;this.buffers=buffers;}
    async start(project,offset,isCurrent=()=>true,until=project.duration){
        this.stop();if(!project.speech.length)return false;const context=this.getContext();await context.resume();if(!isCurrent())return false;if(context.state!=='running')throw Error('Click Play to enable audio in this browser');
        this.anchor=context.currentTime+.04;this.offset=offset;this.running=true;
        for(const clip of project.speech){const remaining=clip.start+clipDuration(clip)-offset;if(remaining<=0||clip.start>=until||clip.muted)continue;
            const buffer=this.buffers.get(clip.assetId);if(!buffer)continue;const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=clip.volume;source.connect(gain);gain.connect(context.destination);
            const late=Math.max(0,offset-clip.start),start=Math.max(0,clip.start-offset),duration=Math.min(clipDuration(clip)-late,until-Math.max(offset,clip.start),buffer.duration-clip.sourceStart-late);
            if(duration<=0){source.disconnect();gain.disconnect();continue;}this.sources.set(source,gain);source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start(this.anchor+start,clip.sourceStart+late,duration);
        }return true;
    }
    time(){return this.running?this.offset+Math.max(0,this.context.currentTime-this.anchor):null;}
    stop(){this.running=false;for(const [source,gain]of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();gain.disconnect();}this.sources.clear();}
    dispose(){this.stop();this.buffers.clear();this.context?.close();}
}
