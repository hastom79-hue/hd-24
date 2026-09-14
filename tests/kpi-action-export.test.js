const fs=require('fs');
function ok(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync('hd24-action-export.js','utf8');
const loader=fs.readFileSync('hd24-ui-v3.js','utf8');
ok(src.includes('hd24SafeReflectSuccessSignature'),'must require safe-reflect success signature');
ok(src.includes('검증반영본'),'must capture only verified reflected workbook downloads');
ok(src.includes('applyKpiActionColumn'),'must call approved workbook postprocessor');
ok(src.includes("/\\.xlsm$/i.test(master.name)"),'must fail closed for XLSM macro preservation');
ok(src.includes('hd24-action-export-complete'),'must emit completion event');
ok(loader.includes('kpi-action-classifier.js?v=22'),'loader must include classifier v22');
ok(loader.includes('kpi-action-workbook.js?v=22'),'loader must include workbook v22');
ok(loader.includes('hd24-action-export.js?v=22'),'loader must include action export v22');
console.log('PASS kpi-action-export production bridge assertions');
