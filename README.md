# LLM Performance Benchmark

> 大语言模型性能基准测试工具

## 功能特性

- 支持 OpenAI 兼容 API
- 支持 Anthropic API
- 测试关键指标:
  - 吞吐量 (Tokens/s)
  - 首 Token 延迟 (TTFT)
  - 总延迟
  - API 响应时间

## 使用场景

- 评估不同模型的性能表现
- 对比多个 API 提供商
- 监控模型性能变化
- 模型选型评估

## 快速开始

### 1. 配置文件

创建 `llm-benchmark.config.json`:

```json
{
  "provider": "openai",
  "api_key": "your-api-key",
  "model": "gpt-4",
  "test_prompts": [
    "写一首关于春天的诗",
    "解释量子计算的基本原理"
  ]
}
```

### 2. 运行测试

```bash
python benchmark.py
```

### 3. 查看结果

```bash
cat results/benchmark_report.json
```

## 详细文档

查看 [SKILL.md](SKILL.md) 获取完整使用指南。

## 许可证

MIT License