from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.find('async function findSheetXmlPath(zip, name){')
end=s.find('\nfunction fmtVal', start)
if start < 0 or end < 0:
    raise SystemExit('findSheetXmlPath boundaries not found')

old=s[start:end]
if "getElementsByTagName('Relationship')" in old and 'new DOMParser()' in old:
    print('Compatibility parser already installed')
    raise SystemExit(0)

new = r'''async function findSheetXmlPath(zip, name){
  const wbFile=zip.file('xl/workbook.xml'),relFile=zip.file('xl/_rels/workbook.xml.rels');
  if(!wbFile||!relFile)throw new Error('총괄 XLSX 구조 오류: workbook 관계파일 없음');
  const parser=new DOMParser();
  const wbDoc=parser.parseFromString(await wbFile.async('string'),'application/xml');
  if(wbDoc.getElementsByTagName('parsererror').length)throw new Error('workbook.xml 파싱 실패');
  const sheet=[...wbDoc.getElementsByTagName('sheet')].find(x=>x.getAttribute('name')===name);
  if(!sheet)throw new Error('총괄 시트 없음: '+name);
  const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  if(!rid)throw new Error('시트 관계 ID 확인 실패: '+name);
  const relDoc=parser.parseFromString(await relFile.async('string'),'application/xml');
  if(relDoc.getElementsByTagName('parsererror').length)throw new Error('workbook 관계 XML 파싱 실패');
  const relation=[...relDoc.getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===rid);
  const target=relation&&relation.getAttribute('Target');
  if(!target)throw new Error('시트 경로 확인 실패: '+name+' / '+rid);
  let clean=target.replace(/\\/g,'/');
  if(clean.startsWith('/')) clean=clean.replace(/^\/+/, '');
  else if(!clean.startsWith('xl/')) clean='xl/'+clean;
  const parts=[];
  for(const part of clean.split('/')){
    if(!part||part==='.')continue;
    if(part==='..')parts.pop();
    else parts.push(part);
  }
  const path=parts.join('/');
  if(!zip.file(path))throw new Error('시트 XML 파일 없음: '+path);
  return path;
}'''

s=s[:start]+new+s[end:]
p.write_text(s,encoding='utf-8')

check=p.read_text(encoding='utf-8')
assert "new DOMParser()" in check
assert "getElementsByTagName('Relationship')" in check
assert "relation.getAttribute('Target')" in check
assert "if(!zip.file(path))" in check
assert "Id=\"'+m[1]+'\"[^>]*Target" not in check
print('SHEET XML RELATIONSHIP COMPATIBILITY PATCHED')
