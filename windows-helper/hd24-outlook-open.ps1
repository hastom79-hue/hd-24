param([Parameter(Mandatory=$true)][string]$EmlPath)
$ErrorActionPreference='Stop'
$full=[IO.Path]::GetFullPath($EmlPath)
if(!(Test-Path -LiteralPath $full)){throw "EML not found: $full"}
$outlook=New-Object -ComObject Outlook.Application
$ns=$outlook.GetNamespace("MAPI")
$mail=$ns.OpenSharedItem($full)
if($null -eq $mail){throw "Classic Outlook could not open the EML draft."}
$mail.Display()
Start-Sleep -Milliseconds 500
if($mail.Sent){throw "Draft unexpectedly marked as sent."}
Write-Host "HD-24 Outlook compose opened. Review recipients/attachments and press Send in Outlook."