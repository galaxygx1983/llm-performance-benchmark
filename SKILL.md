---
name: llm-performance-benchmark
description: |
  LLM性能基准测试工具，支持OpenAI兼容和Anthropic兼容的API接口。
  用于测试大模型的吞吐量、首Token延迟(Time to First Token)、总延迟等关键性能指标。
  适用于：评估不同模型的性能表现、对比多个API提供商、监控模型性能变化。
  使用场景：测试API模型性能、基准测试、模型选型评估。
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
