(()=>{'use strict';
const replaceText=s=>String(s??'').replace(/폐루프 경고/g,'대책 효과검증 미흡').replace(/폐루프/g,'대책 효과검증').replace(/CLOSED LOOP/g,'ACTION EFFECTIVENESS');
function apply(root=document){
 const nodes=[];
 if(root?.nodeType===1){nodes.push(root);if(root.querySelectorAll)nodes.push(...root.querySelectorAll('*'))}
 else if(root===document&&document.querySelectorAll)nodes.push(...document.querySelectorAll('*'));
 nodes.forEach(el=>{if(el.children?.length===0&&el.textContent){const next=replaceText(el.textContent);if(next!==el.textContent)el.textContent=next;}});
 const draft=document.getElementById('hd24FeedbackDraft');
 if(draft&&typeof draft.value==='string'){const next=replaceText(draft.value);if(next!==draft.value){draft.value=next;draft.dispatchEvent(new Event('input',{bubbles:true}));}}
}
let pending=new Set(),raf=0;
function flush(){raf=0;const roots=[...pending];pending.clear();roots.forEach(apply)}
function scheduleRoot(root){if(!root||root.nodeType!==1)return;pending.add(root);if(!raf)raf=requestAnimationFrame(flush)}
function initial(){apply(document)}
document.addEventListener('DOMContentLoaded',initial,{once:true});
document.addEventListener('hd24:reply-feedback-ready',e=>scheduleRoot(document.getElementById('hd24Feedback')||e.target));
document.addEventListener('hd24:reply-imported',()=>scheduleRoot(document.getElementById('hd24Feedback')));
new MutationObserver(records=>{for(const rec of records)for(const n of rec.addedNodes)if(n.nodeType===1)scheduleRoot(n)}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState!=='loading')initial();
window.HD24_TERMINOLOGY_V1={apply,replaceText};
})();