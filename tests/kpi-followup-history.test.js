'use strict';
const assert=require('assert');
const norm=v=>String(v??'').toLowerCase().replace(/\r?\n/g,' ').replace(/["'“”‘’]/g,'').replace(/[()\[\]{}%:/\\,_-]/g,' ').replace(/\s+/g,' ').trim();
function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b||a.includes(b)||b.includes(a))return 1;const A=new Set(a.split(' ').filter(x=>x.length>1)),B=new Set(b.split(' ').filter(x=>x.length>1));let hit=0;A.forEach(x=>B.has(x)&&hit++);return hit/Math.max(1,Math.min(A.size,B.size));}
function recurrence(history){if(history.length<2)return history.length?{sameCauseCount:1,isRecurrence:false}:null;const cause=history[0].rootCause||history[0].reason||'';const same=history.filter(x=>similarity(cause,x.rootCause||x.reason||'')>=0.6).length;return {sameCauseCount:same,isRecurrence:same>=2};}
assert.equal(recurrence([{rootCause:'Supplier welding defect'}]).isRecurrence,false);
assert.equal(recurrence([{rootCause:'Supplier welding defect'},{rootCause:'Supplier welding defect repeated'}]).isRecurrence,true);
assert.equal(recurrence([{rootCause:'Supplier welding defect'},{rootCause:'Paint line delay'}]).isRecurrence,false);
const replies=[];
function addReply(){const prev=replies.filter(x=>x.plant==='india'&&x.targetMonth===7&&x.kpi==='WIP');replies.unshift({plant:'india',targetMonth:7,kpi:'WIP',replySequence:prev.length+1,replyReceivedAt:new Date().toISOString()});}
addReply();addReply();
assert.equal(replies[0].replySequence,2);
assert.equal(replies[1].replySequence,1);
console.log('PASS kpi-followup-history');