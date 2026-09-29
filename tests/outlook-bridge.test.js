const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const w=fs.readFileSync('windows-helper/hd24-outlook-watch.ps1','utf8');
const o=fs.readFileSync('windows-helper/hd24-outlook-open.ps1','utf8');
ok(w.includes("$pattern='HDPS_KPI_*_Outlook.eml'"),'watch pattern missing');
ok(w.includes("$parts=$k -split '\\|'"),'dedupe key split regex must split literal pipe');
ok(!w.includes("if($seen.Count -gt 200){$seen=@{}}"),'whole dedupe reset regression');
ok(w.includes("AddHours(-6).Ticks"),'dedupe retention window missing');
ok(w.includes("OpenSharedItem($_.FullName)")&&w.includes("$mail.Display()"),'watcher must open Outlook draft');
ok(!w.includes(".Send()"),'watcher must never auto-send');
ok(o.includes("OpenSharedItem($full)")&&o.includes("$mail.Display()"),'manual opener must display draft');
ok(!o.includes(".Send()"),'manual opener must never auto-send');
console.log('HD24 OUTLOOK BRIDGE STATIC PASS');
