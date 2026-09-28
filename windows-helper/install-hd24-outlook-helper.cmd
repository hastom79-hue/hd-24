@echo off
setlocal
set "ROOT=%~dp0"
set "PS=%ROOT%hd24-outlook-open.ps1"
if not exist "%PS%" (
  echo Missing %PS%
  exit /b 1
)
reg add "HKCU\Software\Classes\hd24outlook" /ve /d "URL:HD-24 Outlook Draft Protocol" /f >nul
reg add "HKCU\Software\Classes\hd24outlook" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\hd24outlook\shell\open\command" /ve /d "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%PS%\" \"%%1\"" /f >nul
echo Registered hd24outlook protocol for the current Windows user.
echo NOTE: browser protocol URLs cannot carry a downloaded file path directly; this helper is intended for local EML paths.
pause