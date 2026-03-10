"""
LLM 并发压力测试 - Locust 测试脚本

使用方法:
    # Web UI 模式
    locust -f locustfile.py --host http://127.0.0.1:8000

    # 无头模式 (命令行)
    locust -f locustfile.py --host http://127.0.0.1:8000 \
        --users 100 --spawn-rate 10 --run-time 5m --headless

    # 分布式模式
    locust -f locustfile.py --master  # 主节点
    locust -f locustfile.py --worker   # 工作节点
"""

import json
import random
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner, WorkerRunner


# ===========================================
# 测试数据集
# ===========================================

TEST_PROMPTS = [
    # 短提示词 (< 50 tokens)
    "你好，请简单介绍一下自己。",
    "什么是人工智能？",
    "请用一句话解释机器学习。",
    "Python有什么优势？",
    "请写一个简单的Hello World程序。",

    # 中等提示词 (50-200 tokens)
    "请解释一下微服务架构的优缺点，并举例说明什么场景适合使用微服务。",
    "描述一下你理解的敏捷开发流程，包括Scrum和Kanban的区别。",
    "请解释Docker容器和虚拟机的区别，以及各自的适用场景。",
    "什么是RESTful API？请列举几个最佳实践。",
    "请介绍几种常见的数据库索引类型及其工作原理。",

    # 长提示词 (> 200 tokens)
    """请详细分析以下代码的时间复杂度和空间复杂度，并给出优化建议：

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

请从以下几个方面分析：
1. 时间复杂度的最好、最坏和平均情况
2. 空间复杂度
3. 稳定性分析
4. 可能的优化方向
5. 与其他排序算法的比较
""",

    """请设计一个高并发的秒杀系统，要求：
1. 支持每秒10万次的请求量
2. 保证库存扣减的准确性
3. 防止超卖和重复购买
4. 考虑系统的高可用性
5. 提供详细的架构图说明

请从技术选型、架构设计、关键实现等方面详细阐述。""",

    # 代码生成任务
    "请用Python实现一个简单的LRU缓存，支持get和put操作。",
    "写一个函数，判断一个字符串是否是有效的括号组合。",
    "实现一个线程安全的单例模式。",

    # 数学推理任务
    "一个班级有30名学生，其中15人喜欢篮球，10人喜欢足球，5人两者都喜欢。求只喜欢篮球的学生人数。",
    "解释什么是递归，并写一个计算斐波那契数列的递归函数。",

    # 创意写作任务
    "请写一首关于春天的短诗。",
    "以程序员的视角，写一段描述凌晨三点加班的短文。",
]


# 不同类型的测试数据集
CHAT_DATASET = [
    {"role": "user", "content": "你好！今天天气怎么样？"},
    {"role": "user", "content": "请推荐几本科幻小说。"},
    {"role": "user", "content": "如何提高编程能力？"},
]

CODE_GENERATION_DATASET = [
    {"role": "user", "content": "写一个Python快速排序的实现。"},
    {"role": "user", "content": "用JavaScript实现一个简单的HTTP服务器。"},
    {"role": "user", "content": "写一个SQL查询，找出销售额最高的产品。"},
]

LONG_CONTEXT_DATASET = [
    {"role": "user", "content": prompt} for prompt in TEST_PROMPTS[-3:]
]


# ===========================================
# LLM 压力测试用户类
# ===========================================

class LLMUser(HttpUser):
    """
    模拟并发用户访问 LLM API

    配置项:
        wait_time: 请求间隔时间
        model: 模型名称
        max_tokens: 最大生成token数
        temperature: 温度参数
    """

    # 请求间隔 (模拟真实用户思考时间)
    wait_time = between(1, 3)

    # 模型配置
    model = "local-model"
    max_tokens = 256
    temperature = 0.7

    # API 端点
    chat_endpoint = "/v1/chat/completions"
    completion_endpoint = "/v1/completions"

    def on_start(self):
        """用户启动时执行"""
        self.test_prompts = TEST_PROMPTS.copy()

    @task(10)
    def chat_completion(self):
        """聊天补全接口测试 (权重: 10)"""
        prompt = random.choice(self.test_prompts)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": False  # 非流式，便于统计延迟
        }

        self.client.post(
            self.chat_endpoint,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            name="/chat/completions"
        )

    @task(5)
    def chat_completion_streaming(self):
        """流式聊天补全测试 (权重: 5)"""
        prompt = random.choice(self.test_prompts)

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": True  # 流式
        }

        self.client.post(
            self.chat_endpoint,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            name="/chat/completions/streaming"
        )

    @task(3)
    def short_prompt_test(self):
        """短提示词测试 (权重: 3)"""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": random.choice(TEST_PROMPTS[:5])}
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }

        self.client.post(
            self.chat_endpoint,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            name="/chat/completions/short"
        )

    @task(2)
    def long_prompt_test(self):
        """长提示词测试 (权重: 2)"""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": random.choice(TEST_PROMPTS[-5:])}
            ],
            "max_tokens": 512,
            "temperature": 0.7
        }

        self.client.post(
            self.chat_endpoint,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            name="/chat/completions/long"
        )

    @task(1)
    def code_generation_test(self):
        """代码生成测试 (权重: 1)"""
        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": random.choice(CODE_GENERATION_DATASET)["content"]}
            ],
            "max_tokens": 1024,
            "temperature": 0.3  # 代码生成用较低温度
        }

        self.client.post(
            self.chat_endpoint,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            name="/chat/completions/code"
        )


# ===========================================
# 自定义统计事件
# ===========================================

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """请求完成事件监听器"""
    if exception:
        # 记录错误详情
        pass
    else:
        # 记录成功请求的延迟分布
        if response_time > 5000:  # 超过5秒的慢请求
            print(f"[SLOW] {name}: {response_time}ms")


# ===========================================
# 测试完成报告
# ===========================================

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """测试完成时生成报告"""
    if isinstance(environment.runner, MasterRunner):
        # 只在主节点生成报告
        stats = environment.stats

        print("\n" + "="*60)
        print("  LLM 压力测试报告")
        print("="*60)

        print(f"\n总请求数: {stats.total.num_requests}")
        print(f"失败请求: {stats.total.num_failures}")
        print(f"失败率: {stats.total.fail_ratio*100:.2f}%")

        print(f"\n响应时间统计:")
        print(f"  平均: {stats.total.avg_response_time:.2f}ms")
        print(f"  最小: {stats.total.min_response_time:.2f}ms")
        print(f"  最大: {stats.total.max_response_time:.2f}ms")
        print(f"  中位数: {stats.total.median_response_time:.2f}ms")
        print(f"  P95: {stats.total.get_response_time_percentile(0.95):.2f}ms")
        print(f"  P99: {stats.total.get_response_time_percentile(0.99):.2f}ms")

        print(f"\n吞吐量:")
        print(f"  RPS: {stats.total.total_rps:.2f} 请求/秒")

        print("\n" + "="*60)


# ===========================================
# 运行说明
# ===========================================

if __name__ == "__main__":
    print(__doc__)
    print("\n使用说明:")
    print("1. Web UI 模式 (推荐新手):")
    print("   locust -f locustfile.py --host http://your-llm-api:port")
    print("   然后在浏览器打开 http://localhost:8089")
    print()
    print("2. 无头模式 (适合自动化测试):")
    print("   locust -f locustfile.py --host http://your-llm-api:port \\")
    print("       --users 100 --spawn-rate 10 --run-time 5m --headless")
    print()
    print("3. 分布式模式 (适合大规模压测):")
    print("   主节点: locust -f locustfile.py --master")
    print("   工作节点: locust -f locustfile.py --worker --master-host <主节点IP>")