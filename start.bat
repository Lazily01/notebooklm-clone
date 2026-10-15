@echo off
chcp 65001 >nul
echo ========================================
echo    启动 NotebookLM Clone
echo ========================================
echo.

:: 关闭可能存在的旧进程
echo 正在关闭旧进程...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul

:: 启动后端
echo 正在启动后端服务...
cd /d %~dp0backend
start "Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: 等待后端启动
timeout /t 3 >nul

:: 启动前端
echo 正在启动前端服务...
cd /d %~dp0frontend
start "Frontend" cmd /k "npm run dev"

:: 等待前端启动
timeout /t 3 >nul

echo.
echo ========================================
echo    服务已启动！
echo    前端: http://localhost:3000
echo    后端: http://localhost:8000
echo ========================================
echo.
echo 按任意键打开浏览器...
pause >nul

:: 打开浏览器
start http://localhost:3000
