from pathlib import Path
import json,re

root=Path('.')
safe_p=root/'safe-kpi-mapping.js'
safe=safe_p.read_text(encoding='utf-8')

old="function unitCompatible(sf,mf,m){if(sf===mf)return true;const name=normText((m&&m.kpiEn)||((m&&m.kpiKr)||''));if(mf==='mh'&&sf==='time'&&(name.includes('mh')||name.includes('man hours')||name.includes('man-hours')||name.includes('downtime')||name.includes('non operating')||name.includes('non-operating')))return true;return false;}"
new="function unitCompatible(sf,mf,m){if(sf===mf)return true;const name=normText((m&&m.kpiEn)||((m&&m.kpiKr)||''));if(currentPlant==='india'&&name==='ppm'&&sf==='count'&&mf==='ppm')return true;if(currentPlant==='india'&&name==='5s audit score'&&sf==='pct'&&mf==='score')return true;if(mf==='mh'&&sf==='time'&&(name.includes('mh')||name.includes('man hours')||name.includes('man-hours')||name.includes('downtime')||name.includes('non operating')||name.includes('non-operating')))return true;return false;}"
if old not in safe and new not in safe:
    raise SystemExit('unitCompatible anchor missing')
safe=safe.replace(old,new)

horizon_anchor="function sourceHorizon(srcWs,resolved,srcInfo){"
if 'function masterFutureContamination(' not in safe:
    pos=safe.find('function almostEqual(')
    if pos<0: raise SystemExit('almostEqual anchor missing')
    guard="function masterFutureContamination(masterWs,masterInfo,horizon){const b=sheetBounds(masterWs),hits=[];for(let mo=horizon+1;mo<=12;mo++){const c=masterInfo.map[mo];for(let r=1;r<=b.maxR;r++){const raw=getCell(masterWs,r,c);if(raw==null||String(raw).trim()==='')continue;const n=numericCell(raw),a=annotatedNumeric(raw);if(n===null&&a===null)continue;const ref=XLSX.utils.encode_cell({r:r-1,c:c-1});hits.push(`${ref}=${raw}`);}}if(hits.length){log(`총괄 미래월 기존값 ${hits.length}셀 감지: 기준월 ${horizon}월 이후`);log(hits.slice(0,20).join(' | ')+(hits.length>20?' 외 '+(hits.length-20)+'건':''));throw new Error(`총괄 미래월 기존값 ${hits.length}셀 감지. 총괄파일 생성 중단`);}return 0;}\n"
    safe=safe[:pos]+guard+safe[pos:]

old_call="resolved=window.hd24SafeResolveMappings(srcWs,masterWs,srcInfo),horizon=sourceHorizon(srcWs,resolved,srcInfo);if(!horizon)throw new Error('원본 실적 기준월 확인 실패');log(`구조 검증 완료:"
new_call="resolved=window.hd24SafeResolveMappings(srcWs,masterWs,srcInfo),horizon=sourceHorizon(srcWs,resolved,srcInfo);if(!horizon)throw new Error('원본 실적 기준월 확인 실패');masterFutureContamination(masterWs,masterInfo,horizon);log(`구조 검증 완료:"
if old_call not in safe and new_call not in safe:
    raise SystemExit('safeReflect horizon anchor missing')
safe=safe.replace(old_call,new_call)
safe=safe.replace('v15','v16')
safe_p.write_text(safe,encoding='utf-8')

bp=root/'mapping_brazil.json'
brazil=json.loads(bp.read_text(encoding='utf-8'))
lt=[m for m in brazil if m.get('kpiEn')=='LTIR (Lost Time Incident Rate)']
if len(lt)!=1: raise SystemExit(f'Brazil LTIR mapping count={len(lt)}')
lt[0]['unit']='%'
bp.write_text(json.dumps(brazil,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

ui_p=root/'hd24-ui-v3.js'; ui=ui_p.read_text(encoding='utf-8')
ui=re.sub(r'safe-kpi-mapping\.js\?v=\d+','safe-kpi-mapping.js?v=16',ui)
ui_p.write_text(ui,encoding='utf-8')

idx_p=root/'index.html'; idx=idx_p.read_text(encoding='utf-8')
idx=re.sub(r'hd24-ui-v3\.css\?v=\d+','hd24-ui-v3.css?v=16',idx)
idx=re.sub(r'hd24-ui-v3\.js\?v=\d+','hd24-ui-v3.js?v=16',idx)
idx_p.write_text(idx,encoding='utf-8')

for wf in ['.github/workflows/hd24-browser-e2e.yml','.github/workflows/hd24-browser-e2e-brazil.yml']:
    p=root/wf; t=p.read_text(encoding='utf-8').replace('안전 실적 반영 v15 시작','안전 실적 반영 v16 시작'); p.write_text(t,encoding='utf-8')

reg_p=root/'.github/workflows/hd24-runtime-regression.yml'; reg=reg_p.read_text(encoding='utf-8')
if "'총괄 미래월 기존값'," not in reg:
    reg=reg.replace("              '미래월 Actual',\n","              '미래월 Actual',\n              '총괄 미래월 기존값',\n")
if "Brazil LTIR unit regression" not in reg:
    anchor="          rccp=[x for x in brazil if x.get('kpiEn')=='M+1 Production Volume Variation Rate']\n          assert len(rccp)==1 and rccp[0]['scale']==1 and rccp[0]['valueFormat']=='퍼센트텍스트', 'Brazil RCCP string-percent semantics regression'\n"
    add=anchor+"          ltir=[x for x in brazil if x.get('kpiEn')=='LTIR (Lost Time Incident Rate)']\n          assert len(ltir)==1 and ltir[0]['unit']=='%', 'Brazil LTIR unit regression'\n          assert \"name==='ppm'&&sf==='count'&&mf==='ppm'\" in safe, 'India PPM source-unit exception missing'\n          assert \"name==='5s audit score'&&sf==='pct'&&mf==='score'\" in safe, 'India 5S source-unit exception missing'\n          assert 'masterFutureContamination(masterWs,masterInfo,horizon)' in safe, 'master future contamination gate missing'\n"
    if anchor not in reg: raise SystemExit('regression anchor missing')
    reg=reg.replace(anchor,add)
reg_p.write_text(reg,encoding='utf-8')

# Hard assertions before commit
assert '안전 실적 반영 v16 시작' in safe
assert 'masterFutureContamination(masterWs,masterInfo,horizon)' in safe
assert '총괄 미래월 기존값' in safe
assert 'safe-kpi-mapping.js?v=16' in ui
assert 'hd24-ui-v3.js?v=16' in idx and 'hd24-ui-v3.css?v=16' in idx
assert lt[0]['unit']=='%'
print('V16 REAL-FILE HARDENING PATCH PREPARED')
