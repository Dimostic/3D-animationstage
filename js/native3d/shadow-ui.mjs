export function mountShadows({getWorld,getSelected,change,status}){
 const row=document.createElement('label');row.id='object-shadows';row.innerHTML='<input id="cast-shadow" type="checkbox"> Cast shadow';row.style.cssText='display:flex;align-items:center;gap:7px;margin:10px 0';row.firstElementChild.style.width='auto';document.querySelector('#object-form').prepend(row);
 row.firstElementChild.onchange=async e=>{const value=e.target.checked,id=getSelected();try{await change(p=>p.nodes.find(n=>n.id===id).castShadow=value);status(value?'Shadow casting enabled.':'Shadow casting disabled.');}catch(error){refresh();status(error.message,true);}};
 function refresh(){const w=getWorld(),n=w?.project?.nodes.find(n=>n.id===getSelected());row.hidden=!n||['group','camera','light'].includes(n.kind);row.firstElementChild.disabled=row.hidden||w.editLocked(n.id);row.firstElementChild.checked=n?.castShadow??n?.kind!=='plane';row.title='Controls this object only. Shadows are visible in Balanced / High quality when lit by a shadow-casting light.';}
 return {refresh};
}
