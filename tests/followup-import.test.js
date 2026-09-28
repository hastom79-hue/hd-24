const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const src=fs.readFileSync('hd24-followup.js','utf8');
ok(src.includes("if(!cPlant)throw new Error(`Plant column not found: ${ws.name}`)"),'Plant header must be mandatory');
ok(src.includes("if(!cMonth)throw new Error(`Target Month column not found: ${ws.name}`)"),'Target Month header must be mandatory');
ok(src.includes("?'india':''"),'unknown plant must fail closed');
ok(!src.includes("?'india':pkey()"),'unknown plant must not fall back to current plant');
ok(src.includes("const rawMonth=val(cMonth),targetMonth=Number(rawMonth)"),'target month must come from workbook');
ok(!src.includes("targetMonth=Number(val(cMonth))||month()"),'invalid month must not fall back to analysis month');
ok(src.includes("!Number.isInteger(targetMonth)"),'target month must be integer');
ok(src.includes("targetMonth>month()"),'future target month must be blocked');
ok(src.includes("pending.some(x=>x.plant===plant&&x.targetMonth===targetMonth"),'same-file staged duplicate must be blocked');
console.log('HD24 FOLLOWUP IMPORT FAIL-CLOSED PASS');
