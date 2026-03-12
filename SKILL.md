---
name: llm-performance-benchmark
description: LLM大语言模型性能基准测试与压力测试工具。当用户需要测试大模型API性能(OpenAI/Anthropic兼容接口)、测量首Token延迟(TTFT/Time to First Token)、测量吞吐量(Throughput/Tokens Per Second)、测量总延迟(TTLT/Time to Last Token)、进行Locust并发压力测试、评估企业级并发承载能力、对比不同模型性能表现(gpt-4/claude-3/llama等)、对比多个API提供商、监控模型性能变化趋势、进行模型选型评估、生产环境容量规划、测试本地部署大模型性能、配置benchmark测试参数(baseURL/apiKey/model/maxTokens/temperature/runs)、分析流式/非流式响应性能、生成性能测试报告等相关任务时立即使用。支持llm-benchmark.config.json配置文件驱动，输出包含延迟统计、吞吐量、并发性能等完整指标。
trigger:
  - LLM性能测试
  - 大模型基准测试
  - 首Token延迟
  - TTFT测试
  - 吞吐量测试
  - Tokens Per Second
  - Locust压力测试
  - 并发测试
  - API性能对比
  - 模型选型评估
---

# LLM Performance Benchmark

对大语言模型进行基础性能测试，支持OpenAI兼容API和Anthropic API。

## 快速开始

### 1. 配置文件

在当前目录创建 `llm-benchmark.config.json`，参考以下模板：

**OpenAI API:**
```json
{
  "provider": "openai-compatible",
  "baseURL": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "maxTokens": 512,
  "runs": 3
}
```

**Anthropic API:**
```json
{
  "provider": "anthropic",
  "baseURL": "https://api.anthropic.com",
  "apiKey": "sk-ant-...",
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 512,
  "runs": 3
}
```

**OpenAI兼容API (如NVIDIA、Azure、本地模型):**
```json
{
  "provider": "openai-compatible",
  "baseURL": "https://integrate.api.nvidia.com/v1",
  "apiKey": "nvapi-...",
  "model": "nvidia/nemotron-70b",
  "maxTokens": 512,
  "runs": 3
}
```

### 2. 运行测试

```bash
cd <skill-directory>/scripts
npm install
node benchmark.js
```

或指定配置文件路径：
```bash
node benchmark.js --config /path/to/config.json
```

## 配置参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| provider | string | "openai-compatible" | API类型: openai-compatible / anthropic / openai |
| baseURL | string | "" | API基础URL |
| apiKey | string | "" | API密钥 |
| model | string | "" | 模型名称 |
| prompt | string | "Write a short explanation..." | 测试用的提示词 |
| maxTokens | number | 512 | 最大生成token数 |
| temperature | number | 0.7 | 温度参数 |
| runs | number | 3 | 测试运行次数(用于取平均值) |
| delayBetweenRuns | number | 2000 | 每次运行之间的延迟(毫秒) |
| contextWindow | number | 128000 | 模型的上下文窗口大小 |
| outputLimit | number | 4096 | 模型输出限制 |

## 测试指标说明

### 核心指标

1. **TTFT (Time to First Token)** - 首Token延迟
   - 从发送请求到收到第一个token的时间
   - 反映模型的冷启动能力和流式响应速度
   - 单位：秒

2. **TTLT (Time to Last Token)** - 末Token延迟
   - 从发送请求到收到最后一个token的总时间
   - 等同于完整生成的duration
   - 单位：秒

3. **Throughput (吞吐量)**
   - 每秒生成的token数量
   - 计算公式: totalTokens / duration
   - 单位: tokens/s

4. **Time per Token**
   - 平均每个token的生成时间
   - 计算公式: duration * 1000 / totalTokens
   - 单位: ms/token

### 测试模式

1. **流式测试 (Streaming)**
   - 测量首Token延迟和吞吐量
   - 更真实地反映用户体验

2. **非流式测试 (Non-Streaming)**
   - 测量完整响应延迟
   - 适合批量处理场景

## 输出示例

```
══════════════════════════════════════════════════════════════
  BENCHMARK SUMMARY
══════════════════════════════════════════════════════════════

Model: gpt-4
Provider: openai-compatible
Runs: 3

--- Streaming Results ---
First Token Latency (TTFT):
  Min: 0.234s
  Max: 0.289s
  Avg: 0.261s
Time to Last Token (TTLT):
  Min: 3.456s
  Max: 3.789s
  Avg: 3.612s
Throughput (tokens/s):
  Min: 142
  Max: 156
  Avg: 149

--- Non-Streaming Results ---
Total Latency:
  Min: 3.123s
  Max: 3.456s
  Avg: 3.289s
Effective Throughput (tokens/s):
  Min: 156
  Max: 164
  Avg: 160

══════════════════════════════════════════════════════════════
Metrics Legend:
  TTFT = Time To First Token (首Token延迟)
  TTLT = Time To Last Token (最后一个Token的时间)
  Throughput = tokens generated per second (吞吐量)
══════════════════════════════════════════════════════════════
```

## 常见问题

### Q: 提示词长度会影响测试结果吗？
A: 是的。更长的提示词会略微增加处理时间，但主要影响的是首Token延迟，吞吐量基本不变。

### Q: 如何提高测试准确性？
A: 1) 增加runs次数 2) 在低峰时段测试 3) 多次测试取平均值

### Q: 支持本地模型测试吗？
A: 支持。使用openai-compatible provider，配置本地API地址即可。

### Q: token数量是准确的吗？
A: 使用估算方法：英文约1.3 token/词，中文约1.5 token/字符。精确计数需要使用tokenizer。

## 依赖安装

```bash
npm install
```

仅需要Node.js原生模块，无需额外依赖。

## 参考配置

查看 `references/` 目录下的示例配置文件：
- `example-openai.json` - OpenAI官方API
- `example-anthropic.json` - Anthropic API
- `example-nvidia.json` - NVIDIA API
- `locust.conf` - Locust 压力测试配置示例

## 并发压力测试 (Locust)

### 概述

使用 Locust 进行企业级并发压力测试，评估 LLM 服务在高并发场景下的性能表现。

### 安装依赖

```bash
pip install locust
```

### 快速开始

#### 1. Web UI 模式 (推荐)

```bash
cd examples
locust -f locustfile.py --host http://127.0.0.1:8000
```

浏览器打开 http://localhost:8089，配置：
- 用户数 (Number of users)
- 生成速率 (Spawn rate)
- 点击 "Start swarming"

#### 2. 无头模式 (自动化测试)

```bash
locust -f locustfile.py --host http://127.0.0.1:8000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless
```

#### 3. 分布式模式 (大规模压测)

```bash
# 主节点
locust -f locustfile.py --master --master-bind-port=5557

# 工作节点 (可在多台机器上运行)
locust -f locustfile.py --worker --master-host=<主节点IP> --master-port=5557
```

### 测试脚本说明

| 脚本 | 说明 |
|------|------|
| `locustfile.py` | 基础压力测试脚本 |
| `locustfile_advanced.py` | 场景化压力测试 (客服/代码/文档等场景) |

### 测试场景

#### 基础测试 (`locustfile.py`)

| 任务类型 | 权重 | 说明 |
|----------|------|------|
| chat_completion | 10 | 普通聊天补全 |
| chat_completion_streaming | 5 | 流式聊天补全 |
| short_prompt_test | 3 | 短提示词测试 |
| long_prompt_test | 2 | 长提示词测试 |
| code_generation_test | 1 | 代码生成测试 |

#### 场景测试 (`locustfile_advanced.py`)

| 场景 | 说明 |
|------|------|
| CustomerServiceUser | 客服问答场景 |
| CodeAssistantUser | 代码助手场景 |
| DocumentWriterUser | 文档写作场景 |
| DataAnalystUser | 数据分析场景 |
| EducationUser | 教育辅导场景 |
| MixedWorkloadUser | 混合场景 (综合测试) |

### 环境变量配置

```bash
# 设置模型和 Token 限制
export LLM_MODEL="local-model"
export LLM_API_KEY="your-api-key"
export MAX_TOKENS_SHORT=100
export MAX_TOKENS_MEDIUM=256
export MAX_TOKENS_LONG=1024
export LLM_STREAMING=false
```

### 企业级测试建议

#### 1. 渐进式压测

```bash
# 阶段1: 低并发基线测试 (10用户)
locust -f locustfile.py --host http://your-llm:8000 \
    --users 10 --spawn-rate 5 --run-time 3m --headless

# 阶段2: 中等并发 (50用户)
locust -f locustfile.py --host http://your-llm:8000 \
    --users 50 --spawn-rate 10 --run-time 5m --headless

# 阶段3: 高并发压力测试 (100+用户)
locust -f locustfile.py --host http://your-llm:8000 \
    --users 100 --spawn-rate 20 --run-time 10m --headless
```

#### 2. 关键指标参考

| 指标 | 良好 | 可接受 | 需优化 |
|------|------|--------|--------|
| TTFT (首Token延迟) | < 500ms | < 2s | > 2s |
| P95 延迟 | < 3s | < 5s | > 5s |
| 失败率 | < 0.1% | < 1% | > 1% |
| RPS (每秒请求数) | 业务需求 | - | - |

#### 3. 容量规划公式

```
所需并发数 = 目标用户数 × 活跃率 × 每用户QPS / 峰值系数

示例:
- 目标用户: 1000
- 活跃率: 20%
- 每用户QPS: 0.5
- 峰值系数: 3

所需并发 = 1000 × 0.2 × 0.5 / 3 = 33.3 ≈ 35 并发
```

### 测试报告

测试完成后自动生成 HTML 报告:

```
reports/
├── benchmark_20260310_143052.html    # HTML 报告
├── benchmark_20260310_143052_stats.csv
└── benchmark_20260310_143052_stats_history.csv
```

### 与 Prometheus/Grafana 集成

```python
# 在 locustfile.py 中添加
from locust import events
import prometheus_client

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    # 导出 Prometheus 指标
    prometheus_request_latency.observe(response_time / 1000)
    prometheus_request_total.inc()
```

### 常见问题

**Q: 如何测试流式响应?**
A: 设置 `stream: true` 并关注 TTFT 指标:

```python
payload = {
    "model": "your-model",
    "messages": [...],
    "stream": true  # 启用流式
}
```

**Q: 如何模拟真实用户行为?**
A: 使用 `wait_time` 设置请求间隔:

```python
class LLMUser(HttpUser):
    wait_time = between(1, 5)  # 1-5秒随机间隔
```

**Q: 如何测试 Token 吞吐量?**
A: 使用流式模式，统计每秒生成的 Token 数:

```
Token吞吐量 = 总生成Token数 / 总时间
```
