# LLM Performance Benchmark

> 大语言模型性能基准测试与并发压力测试工具

## 功能特性

### 单请求性能测试
- 支持 OpenAI 兼容 API
- 支持 Anthropic API
- 测试关键指标:
  - 吞吐量 (Tokens/s)
  - 首 Token 延迟 (TTFT)
  - 总延迟
  - API 响应时间

### 并发压力测试 (Locust)
- 模拟真实用户并发访问
- 支持多种测试场景 (客服/代码/文档等)
- 分布式压测支持
- 自动生成 HTML 报告
- 企业级容量规划

## 使用场景

- 评估不同模型的性能表现
- 对比多个 API 提供商
- 监控模型性能变化
- 模型选型评估
- **企业并发压力测试**
- **生产环境容量规划**

## 快速开始

### 单请求性能测试

```bash
cd scripts
npm install
node benchmark.js --config config.json
```

### 并发压力测试

```bash
# 安装 Locust
pip install locust

# 运行基础压测
cd examples
locust -f locustfile.py --host http://127.0.0.1:8000

# 无头模式 (自动化)
locust -f locustfile.py --host http://127.0.0.1:8000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless

# 高级场景测试
locust -f locustfile_advanced.py --host http://127.0.0.1:8000
```

## 项目结构

```
llm-performance-benchmark/
├── SKILL.md                   # 完整使用文档
├── README.md                  # 本文件
├── scripts/
│   ├── benchmark.js           # 单请求性能测试脚本
│   ├── package.json           # Node.js 依赖
│   └── llm-benchmark.config.json
├── examples/
│   ├── locustfile.py          # 基础压力测试脚本
│   ├── locustfile_advanced.py # 场景化压力测试脚本
│   ├── run_benchmark.sh        # Linux/Mac 运行脚本
│   └── run_benchmark.bat      # Windows 运行脚本
└── references/
    ├── example-openai.json    # OpenAI 配置示例
    ├── example-anthropic.json # Anthropic 配置示例
    ├── example-nvidia.json    # NVIDIA API 配置示例
    ├── test-datasets.json     # 测试数据集
    └── locust.conf            # Locust 配置模板
```

## 性能指标参考

| 指标 | 良好 | 可接受 | 需优化 |
|------|------|--------|--------|
| TTFT | < 500ms | < 2s | > 2s |
| P95 延迟 | < 3s | < 5s | > 5s |
| 失败率 | < 0.1% | < 1% | > 1% |

## 详细文档

查看 [SKILL.md](SKILL.md) 获取完整使用指南，包括：
- 配置参数详解
- 并发压力测试详细说明
- 企业级测试建议
- 容量规划公式
- Prometheus/Grafana 集成

## 许可证

MIT License