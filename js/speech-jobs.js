(function (global) {
    'use strict';
    const endpoint = '/api/ai/speech-jobs.php';
    async function resolve(result, signal, progress = () => {}) {
        if (!result?.job) return result;
        const id = result.job.id;
        if (!/^sj_[a-f0-9]{32}$/.test(id)) throw new Error('Invalid speech job response.');
        const url = endpoint + '?id=' + encodeURIComponent(id);
        const cancel = () => fetch(url, {method:'DELETE',credentials:'same-origin',keepalive:true,
            headers:{'X-CSRF-Token':global.__STAGE_USER?.csrf_token || ''}}).catch(()=>{});
        signal?.addEventListener('abort',cancel,{once:true});
        if (signal?.aborted) cancel();
        const deadline = Date.now() + 10*60*1000;
        let job = result.job, failures = 0, queuedPolls = 0;
        try {
            while (true) {
                signal?.throwIfAborted();
                if (job.status === 'complete') return job.result;
                if (job.status === 'cancelled') throw new DOMException('Speech job cancelled','AbortError');
                if (job.status === 'failed') throw Object.assign(new Error(job.error || 'Speech processing failed. Retry this section.'), {retryShorter:true});
                if (!['queued','running'].includes(job.status)) throw new Error('Invalid speech job status.');
                if (Date.now() > deadline) throw new Error('Speech is still processing. Retry to reconnect; the server job has been retained.');
                progress(job.status === 'queued' ? 'Queued on the local server...' : 'Processing on the local server...');
                queuedPolls = job.status === 'queued' ? queuedPolls + 1 : 0;
                const delay = Math.min(10000, 2000 + queuedPolls * 1000 + failures * 2000) + Math.floor(Math.random() * 500);
                await new Promise((done,reject)=>{
                    const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
                    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);done();},delay);
                    signal?.addEventListener('abort',abort,{once:true});
                    if(signal?.aborted)abort();
                });
                try {
                    const response=await fetch(url,{credentials:'same-origin',signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)});
                    if(response.status===401||response.status===403||response.status===404)throw Object.assign(new Error('Speech job is unavailable. Sign in again or retry the section.'),{terminal:true});
                    if(!response.ok)throw new Error('Speech status temporarily unavailable.');
                    const body=await response.json();
                    if(body.job?.id!==id)throw new Error('Invalid speech status.');
                    job=body.job;failures=0;
                } catch(error) {
                    if(signal?.aborted || error.terminal)throw error;
                    if(++failures>=5)throw new Error('Connection lost. Retry to reconnect to the retained speech job.');
                    progress('Reconnecting to the local speech job...');
                }
            }
        } finally { signal?.removeEventListener('abort',cancel); }
    }
    function languageNotice(language, task = 'transcribe') {
        if(task==='translate')return 'English, Hausa, Igbo and Yoruba translation is available locally. Language quality has not yet been benchmarked with reviewed recordings; check meaning and names before use.';
        if(language==='ig')return 'Explicit Igbo recognition is not supported by the installed transcription model. Use a reviewed transcript; Igbo text translation is a separate feature.';
        if(language==='auto')return 'Automatic language detection does not add support for unrecognised languages. Local accuracy has not yet been benchmarked; review the transcript.';
        return 'This language is selectable in the transcription model, but local accuracy has not yet been benchmarked. Review names, accents and mixed-language speech.';
    }
    global.SpeechJobs = Object.freeze({resolve,languageNotice});
})(globalThis);
