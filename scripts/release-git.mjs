import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const SOURCE_REMOTE='https://github.com/Dimostic/3D-animationstage.git';
export function releaseGit({cwd,remoteUrl=SOURCE_REMOTE,branch='main',execute}={}){
    const git=(args)=>execute?execute(args):execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    const lines=value=>value.split(/\r?\n/).filter(Boolean);
    function preflight(){
        if(path.resolve(git(['rev-parse','--show-toplevel'])).toLowerCase()!==path.resolve(cwd).toLowerCase())throw Error('Deployment must run from the dedicated 3D repository root');
        if(git(['symbolic-ref','--quiet','--short','HEAD'])!==branch)throw Error('Deploy from '+branch+'; switch branches before deploying');
        for(const args of [['remote','get-url','--all','origin'],['remote','get-url','--push','--all','origin']]){const urls=lines(git(args));if(urls.length!==1||urls[0]!==remoteUrl)throw Error('Deployment requires the dedicated 3D origin; no release uploaded');}
        if(git(['ls-files','--unmerged']))throw Error('Resolve Git conflicts before deploying');
        for(const marker of ['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','rebase-merge','rebase-apply']){const file=git(['rev-parse','--git-path',marker]);if(fs.existsSync(path.resolve(cwd,file)))throw Error('Finish the active Git operation before deploying');}
    }
    function snapshot(){
        const names=[...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))].sort(),hash=crypto.createHash('sha256');
        for(const name of names){hash.update(name+'\0');const file=path.join(cwd,name);try{const stat=fs.lstatSync(file);hash.update(stat.isSymbolicLink()?'link:'+fs.readlinkSync(file):fs.readFileSync(file));}catch(e){if(e.code!=='ENOENT')throw e;hash.update('[deleted]');}hash.update('\0');}
        return {head:git(['rev-parse','HEAD']),files:hash.digest('hex')};
    }
    function assertPublished(commit){preflight();if(git(['status','--porcelain']))throw Error('Source changed after validation; no release uploaded');if(git(['rev-parse','HEAD'])!==commit)throw Error('Source commit changed during deployment');const remote=git(['ls-remote','--exit-code','origin','refs/heads/'+branch]).split(/\s/)[0];if(remote!==commit)throw Error('Remote branch does not match the release commit');}
    function publish(tested,{message='Save validated Animation Stage 3D release'}={}){
        preflight();const current=snapshot();if(current.head!==tested.head||current.files!==tested.files)throw Error('Source changed while checks ran. Run deployment again to validate the new changes.');
        git(['add','--all','--','.']);if(git(['diff','--cached','--name-only']))git(['commit','-m',message]);
        if(snapshot().files!==tested.files||git(['status','--porcelain']))throw Error('Source changed during commit; run checks again before deploying');
        const commit=git(['rev-parse','HEAD']);git(['push','origin','HEAD:refs/heads/'+branch]);assertPublished(commit);return commit;
    }
    return {preflight,snapshot,publish,assertPublished};
}
