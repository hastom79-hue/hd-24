from pathlib import Path

p=Path('safe-kpi-mapping.js')
s=p.read_text(encoding='utf-8')
a=s.index('function unitFamily(v){')
b=s.index('function strictActualRow(', a)
new="""function unitToken(v){return String(v??'').toLowerCase().replace(/\\u00a0/g,' ').trim().replace(/\\s+/g,'');}\nfunction unitFamily(v){const s=unitToken(v);if(!s)return '';if(s.includes('%')||s.includes('percent'))return 'pct';if(s.includes('dptu'))return 'dptu';if(s.includes('ppm'))return 'ppm';if(s.includes('mh/unit')||s.includes('mh/대')||s.includes('mhperunit')||s.includes('mhpermachine')||s.includes('mh/mc')||s.includes('mhper'))return 'mh';if(s==='hh:mm'||s==='time'||s==='hr'||s==='hrs'||s==='hrs.'||s==='hour'||s==='hours')return 'time';if(s.includes('day')||s==='일')return 'day';if(s==='인/건'||s.includes('cases/person')||s.includes('case/person')||s.includes('person/case')||s.includes('index'))return 'ratio';if(s==='nos.'||s==='nos'||s.includes('count')||s.includes('qty')||s.includes('quantity')||s.includes('case')||s.includes('건')||s==='대분')return 'count';if(s.includes('person')||s==='명'||s.includes('명/년'))return 'person';if(s.includes('turn')||s.includes('rev')||s==='회전')return 'turn';if(s.includes('score')||s.includes('point')||s==='점')return 'score';if(s.includes('$')||s.includes('usd')||s.includes('krw')||s.includes('inr')||s.includes('brl'))return 'currency';return '';}\nfunction unitCompatible(sf,mf,m){if(sf===mf)return true;const name=normText((m&&m.kpiEn)||((m&&m.kpiKr)||''));if(mf==='mh'&&sf==='time'&&(name.includes('mh')||name.includes('man hours')||name.includes('man-hours')||name.includes('downtime')||name.includes('non operating')||name.includes('non-operating')))return true;return false;}\nfunction validateUnit(ws,labelRow,m,masterWs,masterRow){const c=sourceUnitCol(),raw=c?getCell(ws,labelRow,c):null,sf=unitFamily(raw),mf=unitFamily(m.unit),masterRaw=masterWs&&masterRow?getCell(masterWs,masterRow,26):null,tf=unitFamily(masterRaw);if(!mf){log(`매핑 단위 미분류 차단: ${m.kpiKr||m.kpiEn} / ${m.unit}`);return false;}if(!sf){if(tf&&unitCompatible(tf,mf,m)){log(`원본 단위 공란 허용(총괄 교차검증 PASS): ${m.kpiKr||m.kpiEn} / 매핑 ${m.unit} / 총괄 ${masterRaw}`);return true;}log(`원본 단위 미분류 차단: ${m.kpiKr||m.kpiEn} / 원본 ${raw} / 매핑 ${m.unit}`);return false;}if(!unitCompatible(sf,mf,m)){log(`단위 불일치 차단: ${m.kpiKr||m.kpiEn} / 원본 ${raw}(${sf}) / 매핑 ${m.unit}(${mf})`);return false;}if(tf&&!unitCompatible(tf,mf,m)&&!unitCompatible(mf,tf,m)){log(`총괄 단위 불일치 차단: ${m.kpiKr||m.kpiEn} / 총괄 ${masterRaw}(${tf}) / 매핑 ${m.unit}(${mf})`);return false;}return true;}\n"""
s=s[:a]+new+s[b:]
s=s.replace("if(!validateUnit(srcWs,sr.row,m)){","if(!validateUnit(srcWs,sr.row,m,masterWs,mr.row)){",1)
old="function strictActualRow(ws,labelRow,m,srcInfo){const r=labelRow+1,b=sheetBounds(ws),kcol=sourceKpiCol();if(r>b.maxR||normText(getCell(ws,r,kcol))!=='')return 0;let seen=0;for(let mo=1;mo<=12;mo++){const raw=getCell(ws,r,srcInfo.map[mo]);if(raw!=null&&String(raw).trim()!=='')seen++;}return seen?r:0;}"
newa="function strictActualRow(ws,labelRow,m,srcInfo){const r=labelRow+1,b=sheetBounds(ws),kcol=sourceKpiCol();if(r>b.maxR||normText(getCell(ws,r,kcol))!=='')return 0;return r;}"
if old not in s: raise SystemExit('strictActualRow target not found')
s=s.replace(old,newa,1)
s=s.replace('안전 실적 반영 v9 시작','안전 실적 반영 v14 시작').replace('안전 매핑 보호모드 v9 활성화','안전 매핑 보호모드 v14 활성화')
p.write_text(s,encoding='utf-8')
ui=Path('hd24-ui-v3.js'); ui.write_text(ui.read_text(encoding='utf-8').replace('safe-kpi-mapping.js?v=13','safe-kpi-mapping.js?v=14'),encoding='utf-8')
idx=Path('index.html'); idx.write_text(idx.read_text(encoding='utf-8').replace('hd24-ui-v3.js?v=13','hd24-ui-v3.js?v=14'),encoding='utf-8')

# static assertions
s=p.read_text(encoding='utf-8')
assert 'function unitToken(v)' in s
assert 'validateUnit(srcWs,sr.row,m,masterWs,mr.row)' in s
assert 'return seen?r:0' not in s
assert '안전 실적 반영 v14 시작' in s
assert 'safe-kpi-mapping.js?v=14' in ui.read_text(encoding='utf-8')
assert 'hd24-ui-v3.js?v=14' in idx.read_text(encoding='utf-8')
print('PATCH_V14_STATIC_PASS')