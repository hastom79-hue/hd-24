param([string]$Downloads=(Join-Path $env:USERPROFILE 'Downloads'))
$ErrorActionPreference='Stop'
$pattern='HDPS_KPI_*_Outlook.eml'
Write-Host "HD-24 Outlook Bridge active: $Downloads"
$seen=@{}
$started=[DateTime]::UtcNow
while($true){
  Get-ChildItem -LiteralPath $Downloads -Filter $pattern -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | ForEach-Object {
    $key=$_.FullName+'|'+$_.LastWriteTimeUtc.Ticks+'|'+$_.Length
    if($_.LastWriteTimeUtc -ge $started.AddSeconds(-2) -and !$seen.ContainsKey($key)){
      $seen[$key]=$true
      try{
        $outlook=New-Object -ComObject Outlook.Application
        $mail=$outlook.GetNamespace('MAPI').OpenSharedItem($_.FullName)
        if($null -eq $mail){throw 'OpenSharedItem returned null'}
        $mail.Display()
        Write-Host ("Opened Outlook draft: "+$_.Name)
      }catch{Write-Warning ("Failed to open "+$_.Name+": "+$_.Exception.Message)}
    }
  }
  if($seen.Count -gt 200){$seen=@{}}
  Start-Sleep -Milliseconds 750
}