import {Box3,Vector3} from 'three';
import {groupObjects,ungroupObjects} from './grouping.mjs';

export function mountGroupingUI({getWorld,getSelected,apply,status}){
    const bar=document.createElement('div');bar.className='scene-group-actions';
    bar.innerHTML='<button id="create-group" type="button" title="Choose objects and put them in a group, keeping their placement and animation">Create Group…</button><button id="ungroup" type="button" title="Remove the selected group container while preserving its objects and speech">Ungroup</button>';
    document.querySelector('.scene-actions').after(bar);
    const create=bar.querySelector('#create-group'),ungroup=bar.querySelector('#ungroup');
    ungroup.onclick=async()=>{try{getWorld().stop();const result=ungroupObjects(getWorld().project,getSelected());await apply(result);status(`Ungrouped ${result.count} objects. Placement, links and speech are preserved. Undo is available.`);}catch(e){status(e.message,true);}};
    create.onclick=()=>{
        const w=getWorld();if(w.exporting)return;w.stop();const dialog=document.createElement('dialog');dialog.id='group-dialog';dialog.className='group-dialog';dialog.setAttribute('aria-labelledby','group-dialog-title');
        dialog.innerHTML='<form><h2 id="group-dialog-title">Create Group</h2><p class="hint">Choose objects in the same parent. Their placement, animation and links stay intact.</p><label>Group name<input id="group-name" maxlength="160" value="New group" required></label><label>Objects in<select id="group-parent"></select></label><div class="paired"><button type="button" data-all>Select All</button><button type="button" data-clear>Clear</button></div><div class="group-object-list" role="group" aria-label="Objects to group"></div><output data-count></output><p data-error role="alert"></p><div class="paired"><button type="submit" class="primary">Create Group</button><button type="button" data-cancel>Cancel</button></div></form>';
        document.body.append(dialog);const form=dialog.querySelector('form'),parent=dialog.querySelector('#group-parent'),list=dialog.querySelector('.group-object-list'),checked=new Set(),error=dialog.querySelector('[data-error]'),count=dialog.querySelector('[data-count]');
        let pending=false;const setPending=value=>{pending=value;form.setAttribute('aria-busy',String(value));form.querySelectorAll('input,select,button').forEach(el=>el.disabled=value);};dialog.addEventListener('cancel',e=>{if(pending)e.preventDefault();});
        const selected=w.project.nodes.find(n=>n.id===getSelected());parent.add(new Option('World',''));for(const n of w.project.nodes.filter(n=>n.kind==='group'))parent.add(new Option(n.name,n.id));parent.value=selected?.parent||'';
        const update=()=>{count.textContent=checked.size+' objects chosen';form.querySelector('[type=submit]').disabled=!checked.size;};
        function refresh(){checked.clear();list.replaceChildren();error.textContent='';const siblings=w.project.nodes.filter(n=>(n.parent||'')===parent.value);for(const n of siblings){const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');box.type='checkbox';box.value=n.id;box.checked=n.id===selected?.id;if(box.checked)checked.add(n.id);text.textContent=n.name+' · '+n.kind;label.append(box,text);list.append(label);box.onchange=()=>{box.checked?checked.add(n.id):checked.delete(n.id);update();};}if(!siblings.length)list.textContent='No objects in this parent.';update();}
        parent.onchange=refresh;dialog.querySelector('[data-all]').onclick=()=>{list.querySelectorAll('input').forEach(b=>{b.checked=true;checked.add(b.value);});update();};dialog.querySelector('[data-clear]').onclick=()=>{checked.clear();list.querySelectorAll('input').forEach(b=>b.checked=false);update();};
        dialog.querySelector('[data-cancel]').onclick=()=>{if(!pending)dialog.close();};dialog.addEventListener('close',()=>{dialog.remove();create.focus();},{once:true});
        form.onsubmit=async event=>{event.preventDefault();if(pending)return;setPending(true);error.textContent='';try{
            w.content.updateWorldMatrix(true,true);const bounds=new Box3();for(const id of checked){const root=w.entries.get(id)?.root;if(root)bounds.union(new Box3().setFromObject(root));}
            const pivot=bounds.isEmpty()?new Vector3():bounds.getCenter(new Vector3()),target=parent.value?w.entries.get(parent.value).root:w.content;if(!bounds.isEmpty())target.worldToLocal(pivot);
            const result=groupObjects(w.project,[...checked],dialog.querySelector('#group-name').value,pivot.toArray());await apply(result);dialog.close();status(`Grouped ${result.count} objects. Placement and animation are preserved. Undo is available.`);
        }catch(e){error.textContent=e.message;setPending(false);update();}};
        refresh();dialog.showModal();dialog.querySelector('#group-name').select();
    };
    return {refresh(){ungroup.disabled=getWorld()?.project.nodes.find(n=>n.id===getSelected())?.kind!=='group';}};
}
