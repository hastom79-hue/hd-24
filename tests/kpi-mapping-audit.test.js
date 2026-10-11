const assert=require('node:assert/strict');
const fs=require('node:fs');
for(const plant of ['india','brazil']){
 const rows=JSON.parse(fs.readFileSync('mapping_'+plant+'.json','utf8'));
 assert.equal(rows.length,76);
 for(const key of ['actualRow','masterRow'])assert.equal(new Set(rows.map(r=>r[key])).size,76);
 for(const row of rows){assert.ok(row.kpiEn&&row.kpiKr&&row.unit);assert.ok(Number.isInteger(row.actualRow)&&Number.isInteger(row.masterRow));assert.ok(Number.isFinite(row.scale)&&row.scale>0);}
 const unusual=rows.filter(r=>r.unit==='%'&&r.scale!==100).map(r=>r.kpiEn).sort();
 assert.deepEqual(unusual,plant==='brazil'?['M+1 Production Volume Variation Rate','W+3 Mix Variation Rate']:[]);
 if(plant==='brazil'){
  const exceptions=rows.filter(r=>r.unit==='%'&&r.scale===1).map(r=>({name:r.kpiEn,actualRow:r.actualRow,masterRow:r.masterRow,format:r.valueFormat}));
  assert.deepEqual(exceptions,[
   {name:'M+1 Production Volume Variation Rate',actualRow:109,masterRow:82,format:'퍼센트텍스트'},
   {name:'W+3 Mix Variation Rate',actualRow:111,masterRow:81,format:'숫자'}
  ],'Brazil percent exceptions changed; verify source workbook before accepting');
 }

}
console.log('HD24 mapping audit: PASS; Brazil percent exceptions require workbook validation');
