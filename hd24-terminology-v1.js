(()=>{'use strict';
const replaceText=s=>String(s??'').replace(/폐루프 경고/g,'대책 효과검증 미흡').replace(/폐루프/g,'대책 효과검증').replace(/CLOSED LOOP/g,'ACTION EFFECTIVENESS');
function apply(root=document){
 const scope=root&&root.querySelectorAll?root:document;
 scope.querySelectorAll('*').forEach(el=>{if(el.children.length===0&&el.textContent){const next=replaceText(el.textContent);if(next!==el.textContent)el.textContent=next;}});
 const draft=document.getElementById('hd24FeedbackDraft');
 if(draft&&typeof draft.value==='string'){const next=replaceText(draft.value);if(next!==draft.value){draft.value=next;draft.dispatchEvent(new Event('input',{bubbles:true}));}}
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply(document)});};
document.addEventListener('DOMContentLoaded',schedule);document.addEventListener('hd24:reply-feedback-ready',schedule);document.addEventListener('hd24:reply-imported',schedule);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
window.HD24_TERMINOLOGY_V1={apply,replaceText};
})();