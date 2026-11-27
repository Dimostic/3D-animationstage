import {clipDuration} from './speech.mjs';
const RATE=48000,MAX_BYTES=512*1024*1024;
export function movieOptions(project,raw={}){
    const options={width:1280,height:720,fps:24,start:0,end:project.duration,format:'auto',quality:'balanced',camera:'scene',sound:true,captions:true,...raw};
    const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    if(!Number.isInteger(options.width)||!Number.isInteger(options.height)||options.width%2||options.height%2||!finite(options.width,160,1920)||!finite(options.height,160,1920)||options.width*options.height>1920*1080||![12,24,30].includes(options.fps)||!finite(options.start,0,project.duration)||!finite(options.end,options.start+.05,project.duration)||!['auto','mp4','webm'].includes(options.format)||!['draft','balanced','high'].includes(options.quality)||!['scene','editor'].includes(options.camera)||typeof options.sound!=='boolean'||typeof options.captions!=='boolean')throw Error('Choose valid movie dimensions, frame rate and a time range inside the scene');
    const duration=options.end-options.start,bitrate=Math.round(Math.max(500000,Math.min(16000000,options.width*options.height*options.fps*({draft:.08,balanced:.15,high:.25})[options.quality])));
    const estimatedBytes=Math.ceil((bitrate+(options.sound?192000:0))*duration/8*1.15);
    if(estimatedBytes>MAX_BYTES)throw Error('Choose a shorter range or lower resolution/quality to keep this browser export below about 512 MB');
    return {...options,duration,bitrate,estimatedBytes,frames:Math.ceil(duration*options.fps-1e-8)};
}
export function audibleClips(project,options){return project.speech.filter(c=>options.sound&&!c.muted&&c.volume>0&&c.start<options.end&&c.start+clipDuration(c)>options.start);}
export function mixMovieAudio(project,buffers,rangeStart,offset,length,rate=RATE){
    const data=[new Float32Array(length),new Float32Array(length)];let clipped=0;
    for(const clip of project.speech){if(clip.muted||clip.volume<=0)continue;const buffer=buffers.get(clip.assetId);if(!buffer)throw Error('A recording is not decoded. Reopen the project before exporting');
        if(buffer.numberOfChannels>2)throw Error('Movie export supports mono or stereo recordings. Import a stereo mix of '+clip.name);
        const begin=Math.max(offset,Math.ceil((clip.start-rangeStart)*rate-1e-8)),end=Math.min(offset+length,Math.ceil((clip.start+clipDuration(clip)-rangeStart)*rate-1e-8));
        if(end<=begin)continue;
        for(let channel=0;channel<2;channel++){const source=buffer.getChannelData(Math.min(channel,buffer.numberOfChannels-1)),target=data[channel];
            for(let sample=begin;sample<end;sample++){const position=(rangeStart+sample/rate-clip.start+clip.sourceStart)*buffer.sampleRate,index=Math.floor(position),fraction=position-index;
                if(index>=0&&index<source.length)target[sample-offset]+=(source[index]*(1-fraction)+(source[index+1]??source[index])*fraction)*clip.volume;
            }
        }
    }
    for(const channel of data)for(let i=0;i<length;i++)if(Math.abs(channel[i])>1){channel[i]=Math.max(-1,Math.min(1,channel[i]));clipped++;}
    return {data,clipped};
}
let mediaPromise;
export function movieEncoder(){const url=new URL('./movie-codecs.js',import.meta.url);url.search=new URL(import.meta.url).search;return mediaPromise??=import(url.href).catch(error=>{mediaPromise=null;throw Error('Movie encoder could not load. Rebuild/reload the local app and retry.',{cause:error});});}
async function chooseFormat(media,options,withAudio){
    if(!globalThis.VideoEncoder||!globalThis.VideoFrame||withAudio&&!globalThis.AudioEncoder)throw Error('Movie export needs WebCodecs. Use a current Chrome/Edge browser on localhost or HTTPS');
    for(const format of options.format==='auto'?['mp4','webm']:[options.format]){
        const video=format==='mp4'?'avc':'vp9',audio=format==='mp4'?'aac':'opus';
        if(await media.canEncodeVideo(video,{width:options.width,height:options.height,frameRate:options.fps,bitrate:options.bitrate})&&(!withAudio||await media.canEncodeAudio(audio,{sampleRate:RATE,numberOfChannels:2,bitrate:192000})))return {format,video,audio};
    }
    throw Error(options.format==='mp4'?'This browser cannot encode the requested MP4 with its soundtrack. Choose WebM or Automatic.':'This browser cannot encode this movie. Try Automatic, a lower resolution, or another current Chrome/Edge browser.');
}
const abortError=()=>new DOMException('Movie export cancelled','AbortError');
export async function exportNativeMovie(world,raw={},hooks={}){
    if(world.exporting)throw Error('A movie export is already running');
    const project=world.project,options=movieOptions(project,raw),signal=hooks.signal;
    const check=()=>{if(signal?.aborted)throw abortError();};check();
    hooks.onProgress?.({phase:'Preparing encoder',frames:0,total:options.frames});
    const media=await movieEncoder();check();const active=audibleClips(project,options),withAudio=active.length>0,chosen=await chooseFormat(media,options,withAudio);check();
    if(world.project!==project)throw Error('The scene changed while preparing the export. Start it again.');
    for(const clip of active){const buffer=world.audio.buffers.get(clip.assetId);if(!buffer)throw Error('Missing decoded recording: '+clip.name);if(buffer.numberOfChannels>2)throw Error('Import a mono/stereo mix of '+clip.name+' before movie export');}
    const parts=[];let bytes=0,session,output,complete=false;
    try{
        const canvas=document.createElement('canvas');canvas.width=options.width;canvas.height=options.height;
        const bufferTarget=chosen.format==='webm'?new media.BufferTarget():null;
        const target=bufferTarget||new media.AppendOnlyStreamTarget(new WritableStream({write(data){check();parts.push(new Blob([data]));}}));
        target.on('write',({end})=>{check();bytes=Math.max(bytes,end);if(bytes>MAX_BYTES)throw Error('Movie reached the 512 MB browser limit. Shorten its range or lower quality.');});
        output=new media.Output({format:chosen.format==='mp4'?new media.Mp4OutputFormat({fastStart:'fragmented'}):new media.WebMOutputFormat(),target});
        // VP9 quality-mode lookahead can stall flush after an encode/decode/re-export cycle.
        // Realtime latency bounds buffering; deterministic offline timestamps and bitrate stay unchanged.
        const video=new media.CanvasSource(canvas,{codec:chosen.video,bitrate:options.bitrate,keyFrameInterval:2,...(chosen.format==='webm'?{latencyMode:'realtime'}:{})});output.addVideoTrack(video);
        const audio=withAudio?new media.AudioBufferSource({codec:chosen.audio,bitrate:192000}):null;if(audio)output.addAudioTrack(audio);
        const cancel=()=>{void output.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
        try{
            await output.start();check();session=world.movieSession(options);let audioCursor=0,clippedSamples=0;const totalSamples=Math.round(options.duration*RATE);
            for(let i=0;i<options.frames;i++){
                check();const timestamp=i/options.fps,span=Math.min(1/options.fps,options.duration-timestamp);
                session.render(options.start+timestamp,canvas,options.captions);check();await video.add(timestamp,span);
                if(audio){const target=Math.min(totalSamples,Math.ceil((timestamp+span)*RATE));while(audioCursor<target){check();const length=Math.min(RATE,totalSamples-audioCursor),mixed=mixMovieAudio({...project,speech:active},world.audio.buffers,options.start,audioCursor,length),buffer=new AudioBuffer({length,sampleRate:RATE,numberOfChannels:2});for(let ch=0;ch<2;ch++)buffer.copyToChannel(mixed.data[ch],ch);clippedSamples+=mixed.clipped;await audio.add(buffer);audioCursor+=length;}}
                hooks.onProgress?.({phase:'Rendering '+chosen.format.toUpperCase(),frames:i+1,total:options.frames,bytes});
                hooks.onFrame?.(canvas,{index:i,time:options.start+timestamp,total:options.frames});
                await new Promise(resolve=>setTimeout(resolve,0));
            }
            check();video.close();audio?.close();hooks.onProgress?.({phase:'Finishing movie',frames:options.frames,total:options.frames,bytes});await output.finalize();check();complete=true;
            return {blob:new Blob(bufferTarget?[bufferTarget.buffer]:parts,{type:chosen.format==='mp4'?'video/mp4':'video/webm'}),format:chosen.format,width:options.width,height:options.height,fps:options.fps,frames:options.frames,duration:options.duration,audio:withAudio,audioSamples:audioCursor,clippedSamples,range:[options.start,options.end]};
        }finally{signal?.removeEventListener('abort',cancel);}
    }catch(error){if(signal?.aborted)throw abortError();throw error;}
    finally{try{if(!complete&&output)await output.cancel();}finally{session?.restore();parts.length=0;}}
}
