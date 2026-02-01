@echo off
cd /d "C:\srv\ai-cbdes-rule\app"
set PYTHONUTF8=1
"C:\srv\ai-cbdes-rule\app\.venv\Scripts\python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
