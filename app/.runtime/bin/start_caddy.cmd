@echo off
cd /d "C:\srv\ai-cbdes-rule\app"
"C:\srv\ai-cbdes-rule\app\.runtime\bin\caddy.exe" run --config "C:\srv\ai-cbdes-rule\app\.runtime\Caddyfile"
