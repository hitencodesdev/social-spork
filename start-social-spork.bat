@echo off
title Social Spork Automation Launcher
echo ===================================================
echo Starting Social Spork Complaint ^& WhatsApp System...
echo ===================================================
cd /d "C:\Users\hp\.gemini\antigravity\scratch\social-spork\backend"
timeout /t 2 /nobreak >nul
start http://localhost:5000
"C:\Program Files\nodejs\node.exe" src/server.js
pause
