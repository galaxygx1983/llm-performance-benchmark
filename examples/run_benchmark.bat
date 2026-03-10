@echo off
REM LLM 压力测试 - Windows 批处理脚本
REM
REM 使用方法:
REM     run_benchmark.bat [选项]
REM
REM 选项:
REM     --users N        并发用户数 (默认: 10)
REM     --duration N     测试时长，分钟 (默认: 5)
REM     --host URL       目标服务地址 (默认: http://127.0.0.1:8000)
REM     --scenario NAME  测试场景 (默认: basic)
REM     --headless       无头模式 (不启动Web UI)
REM
REM 示例:
REM     run_benchmark.bat --users 50 --duration 10
REM     run_benchmark.bat --users 500 --duration 30 --headless

setlocal EnableDelayedExpansion

REM 默认配置
set USERS=10
set DURATION=5
set HOST=http://127.0.0.1:8000
set SCENARIO=basic
set HEADLESS=
set SCRIPT_DIR=%~dp0

REM 解析命令行参数
:parse_args
if "%~1"=="" goto :run_test
if /I "%~1"=="--users" (
    set USERS=%~2
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--duration" (
    set DURATION=%~2
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--host" (
    set HOST=%~2
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--scenario" (
    set SCENARIO=%~2
    shift
    shift
    goto :parse_args
)
if /I "%~1"=="--headless" (
    set HEADLESS=--headless
    shift
    goto :parse_args
)
echo 未知选项: %~1
exit /b 1

:run_test
REM 选择测试脚本
if "%SCENARIO%"=="basic" (
    set LOCUST_FILE=%SCRIPT_DIR%locustfile.py
) else if "%SCENARIO%"=="advanced" (
    set LOCUST_FILE=%SCRIPT_DIR%locustfile_advanced.py
) else (
    echo 错误: 未知场景 '%SCENARIO%'
    echo 可用场景: basic, advanced
    exit /b 1
)

REM 创建报告目录
if not exist "%SCRIPT_DIR%..\reports" mkdir "%SCRIPT_DIR%..\reports"

REM 生成时间戳
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "datetime=%%a"
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

REM 显示测试配置
echo ==========================================
echo   LLM 压力测试
echo ==========================================
echo.
echo 场景: %SCENARIO%
echo 用户数: %USERS%
echo 时长: %DURATION%分钟
echo 目标: %HOST%
echo 脚本: %LOCUST_FILE%
echo.

REM 运行 Locust
locust -f "%LOCUST_FILE%" ^
    --host "%HOST%" ^
    --users %USERS% ^
    --spawn-rate 10 ^
    --run-time %DURATION%m ^
    %HEADLESS% ^
    --html "%SCRIPT_DIR%..\reports\benchmark_%TIMESTAMP%.html" ^
    --csv "%SCRIPT_DIR%..\reports\benchmark_%TIMESTAMP%"

echo.
echo 报告已保存到: reports\benchmark_%TIMESTAMP%.html

endlocal