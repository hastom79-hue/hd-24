const assert=require('node:assert/strict');
const fs=require('node:fs');
for(const plant of ['india','brazil']){
 const rows=JSON.parse(fs.readFileSync('mapping_'+plant+'.json','utf8'));
 assert.equal(rows.length,76);
 for(const key of ['actualRow','masterRow'])assert.equal(new Set(rows.map(r=>r[key])).size,76);
 for(const row of rows){assert.ok(row.kpiEn&&row.kpiKr&&row.unit);assert.ok(Number.isInteger(row.actualRow)&&Number.isInteger(row.masterRow));assert.ok(Number.isFinite(row.scale)&&row.scale>0);}
 const unusual=rows.filter(r=>r.unit==='%'&&r.scale!==100).map(r=>r.kpiEn).sort();
 assert.deepEqual(unusual,plant==='brazil'?['M+1 Production Volume Variation Rate','W+3 Mix Variation Rate']:[]);
}
console.log('HD24 mapping audit: PASS; Brazil percent exceptions require workbook validation');
