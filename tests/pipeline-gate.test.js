'use strict';
const assert=require('assert');
function canAnalyze({plant,signature,successfulSignature}){
  if(plant==='ulsan')return true;
  if(plant!=='india'&&plant!=='brazil')return false;
  return !!(signature&&signature===successfulSignature);
}
assert.equal(canAnalyze({plant:'india',signature:'A',successfulSignature:''}),false,'India must stay blocked before safe reflect success');
assert.equal(canAnalyze({plant:'brazil',signature:'A',successfulSignature:'B'}),false,'new Brazil file pair must not inherit prior success');
assert.equal(canAnalyze({plant:'india',signature:'A',successfulSignature:'A'}),true,'same verified file pair may proceed');
assert.equal(canAnalyze({plant:'brazil',signature:'A',successfulSignature:'A'}),true,'Brazil may proceed only after same-pair success');
assert.equal(canAnalyze({plant:'ulsan',signature:'',successfulSignature:''}),true,'Ulsan does not require source reflect gate');
console.log('PASS pipeline-gate fail-closed');