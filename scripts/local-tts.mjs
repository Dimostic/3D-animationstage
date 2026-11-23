import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./local-tts.ps1',import.meta.url));let pending=false;
function sapi(request,signal){return new Promise((resolve,reject)=>{
    if(process.platform!=='win32')return reject(Error('Local Windows speech is unavailable on this server. Import a recording or configure a separate 3D voice service.'));
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',done=false,stopped=null;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>{stopped=Object.assign(Error('Speech generation cancelled'),{name:'AbortError'});child.kill();};const timer=setTimeout(()=>{stopped=Error('Speech generation timed out. Try shorter text.');child.kill();},60000);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
    child.stdout.on('data',data=>out+=data);child.stderr.on('data',data=>{if(err.length<4000)err+=data;});child.on('error',error=>finish(error));child.on('close',code=>finish(stopped||(code?Error('Windows speech failed. Choose an installed voice and try again.',{cause:Error(err)}):null),out));child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
});}
export async function localVoices(signal){const list=JSON.parse(await sapi({mode:'voices'},signal));return Array.isArray(list)?list:[list];}
export async function localSpeech(input,signal){
    if(typeof input?.text!=='string'||!input.text.trim()||input.text.length>2000||typeof input.voice!=='string'||input.voice.length>1000||!Number.isInteger(input.rate)||input.rate< -5||input.rate>5)throw Error('Enter up to 2,000 characters, choose a voice and a speed from -5 to 5.');
    if(pending)throw Error('Another speech request is running. Try again when it finishes.');pending=true;let directory;
    try{directory=await fs.mkdtemp(path.join(os.tmpdir(),'animationstage3d-voice-'));const output=path.join(directory,'speech.wav');await sapi({mode:'speak',text:input.text.trim(),voice:input.voice,rate:input.rate,output},signal);const data=await fs.readFile(output);if(data.length<44||data.length>20*1024*1024||data.toString('ascii',0,4)!=='RIFF')throw Error('Voice generation returned invalid audio.');return data;}
    finally{pending=false;if(directory){const target=path.resolve(directory),parent=path.resolve(os.tmpdir());if(path.dirname(target)!==parent||!path.basename(target).startsWith('animationstage3d-voice-'))throw Error('Unexpected speech temporary directory');await fs.rm(target,{recursive:true,force:true});}}
}
export async function handleLocalTTS(req,res){
    const name=new URL(req.url,'http://localhost').pathname;if(!['/api/native3d/voices','/api/native3d/speech'].includes(name))return false;
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){json(403,{error:'Use speech from this local 3D workspace.'});return true;}
    const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try{if(name.endsWith('voices')){if(req.method!=='GET'){json(405,{error:'Use GET'});return true;}const voices=await localVoices(controller.signal);json(200,{provider:'Windows local',voices});}
        else{if(req.method!=='POST'||!req.headers['content-type']?.startsWith('application/json')){json(405,{error:'Use JSON POST'});return true;}let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>20000){json(413,{error:'Speech request too large'});return true;}}const data=await localSpeech(JSON.parse(body),controller.signal);res.writeHead(200,{'Content-Type':'audio/wav','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);}}
    catch(error){if(!res.destroyed)json(error.name==='AbortError'?499:400,{error:error.message});}return true;
}
