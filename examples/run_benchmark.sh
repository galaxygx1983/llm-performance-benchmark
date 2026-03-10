"""
运行压力测试的 Shell 脚本

使用方法:
    ./run_benchmark.sh [选项]

选项:
    --users N        并发用户数 (默认: 10)
    --duration N     测试时长，分钟 (默认: 5)
    --host URL       目标服务地址 (默认: http://127.0.0.1:8000)
    --scenario NAME  测试场景 (默认: basic)
    --headless       无头模式 (不启动Web UI)

示例:
    # 基础测试
    ./run_benchmark.sh --users 50 --duration 10

    # 大规模压测
    ./run_benchmark.sh --users 500 --duration 30 --headless

    # 特定场景
    ./run_benchmark.sh --scenario mixed --users 100
"""

#!/bin/bash

# 默认配置
USERS=10
DURATION=5
HOST="http://127.0.0.1:8000"
SCENARIO="basic"
HEADLESS=""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --users)
            USERS="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --scenario)
            SCENARIO="$2"
            shift 2
            ;;
        --headless)
            HEADLESS="--headless"
            shift
            ;;
        *)
            echo "未知选项: $1"
            exit 1
            ;;
    esac
done

# 选择测试脚本
case $SCENARIO in
    basic)
        LOCUST_FILE="$SCRIPT_DIR/locustfile.py"
        ;;
    advanced)
        LOCUST_FILE="$SCRIPT_DIR/locustfile_advanced.py"
        ;;
    *)
        echo "错误: 未知场景 '$SCENARIO'"
        echo "可用场景: basic, advanced"
        exit 1
        ;;
esac

# 创建报告目录
mkdir -p "$SCRIPT_DIR/../reports"

# 生成时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 运行测试
echo "=========================================="
echo "  LLM 压力测试"
echo "=========================================="
echo ""
echo "场景: $SCENARIO"
echo "用户数: $USERS"
echo "时长: ${DURATION}分钟"
echo "目标: $HOST"
echo "脚本: $LOCUST_FILE"
echo ""

locust -f "$LOCUST_FILE" \
    --host "$HOST" \
    --users "$USERS" \
    --spawn-rate 10 \
    --run-time "${DURATION}m" \
    $HEADLESS \
    --html "$SCRIPT_DIR/../reports/benchmark_${TIMESTAMP}.html" \
    --csv "$SCRIPT_DIR/../reports/benchmark_${TIMESTAMP}"

echo ""
echo "报告已保存到: reports/benchmark_${TIMESTAMP}.html"