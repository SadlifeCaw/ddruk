@echo off
setlocal
cd /d "%~dp0"

set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

node --version >nul 2>nul
if "%ERRORLEVEL%"=="0" (
  node server.cjs
  goto :eof
)

if exist "%CODEX_NODE%" (
  "%CODEX_NODE%" server.cjs
  goto :eof
)

echo Node.js was not found.
echo Install Node.js from https://nodejs.org/ and run this file again.
pause
