@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

rem ============================================================
rem  ZhiShanBaiWeiXing - Web Launcher
rem  1. Kill stale http.server processes on port 8080
rem  2. Start local HTTP server on port 8080 (silent)
rem     - stdout/stderr redirected to _server.log so the log
rem       pipe always has a consumer (avoids blocked server)
rem  3. Wait until server is ready, then open browser
rem  NOTE: Keep this file pure ASCII (no Chinese) to avoid
rem        encoding issues on Windows cmd.
rem ============================================================

echo [ZhiSheng] Preparing to start local server on port 8080...

rem ---- Kill stale server processes on port 8080 ----
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  echo [ZhiSheng] Killing stale server process: %%p
  taskkill /f /pid %%p >nul 2>&1
)

rem ---- Small pause so the port is fully released ----
timeout /t 1 /nobreak >nul 2>&1

rem ---- Remove old log file ----
if exist "_server.log" del /q "_server.log"

rem ---- Start server detached (redirect log to file) ----
start "ZhiShengServer" /b pythonw -m http.server 8080 >"_server.log" 2>&1

rem ---- Wait until port 8080 is listening (max 5 seconds) ----
set /a tries=0
:waitloop
timeout /t 1 /nobreak >nul 2>&1
set /a tries+=1
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto ready
if %tries% lss 5 goto waitloop

echo [ZhiSheng] Server did not start. See _server.log for details.
pause
exit /b 1

:ready
echo [ZhiSheng] Server ready at http://localhost:8080
start http://localhost:8080/index.html
exit /b 0
