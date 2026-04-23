"""
LLM 高级压力测试 - 支持多种测试场景

使用方法:
    # 场景测试
    locust -f locustfile_advanced.py --host http://127.0.0.1:8000

    # 指定场景
    locust -f locustfile_advanced.py --host http://127.0.0.1:8000 \
        --users 50 --spawn-rate 5 --run-time 10m --headless
"""

import json
import os
import time
import random
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


# ===========================================
# 配置
# ===========================================

# 从环境变量读取配置
CONFIG = {
    "model": os.getenv("LLM_MODEL", "local-model"),
    "api_key": os.getenv("LLM_API_KEY", ""),
    "api_key_header": os.getenv("LLM_API_KEY_HEADER", "Authorization"),
    "max_tokens_short": int(os.getenv("MAX_TOKENS_SHORT", "100")),
    "max_tokens_medium": int(os.getenv("MAX_TOKENS_MEDIUM", "256")),
    "max_tokens_long": int(os.getenv("MAX_TOKENS_LONG", "1024")),
    "streaming": os.getenv("LLM_STREAMING", "false").lower() == "true",
}


def build_headers():
    """构建请求 headers"""
    headers = {"Content-Type": "application/json"}
    if CONFIG["api_key"]:
        if CONFIG["api_key_header"].lower() == "authorization":
            headers["Authorization"] = f"Bearer {CONFIG['api_key']}"
        elif CONFIG["api_key_header"].lower() == "x-api-key":
            headers["x-api-key"] = CONFIG["api_key"]
        else:
            headers[CONFIG["api_key_header"]] = CONFIG["api_key"]
    return headers


# 共用 headers
DEFAULT_HEADERS = build_headers()


# ===========================================
# 测试场景数据集
# ===========================================

# 1. 客服场景
CUSTOMER_SERVICE_PROMPTS = [
    "您好，我想咨询一下产品价格。",
    "我的订单什么时候能发货？",
    "请问如何申请退款？",
    "产品有什么保修政策？",
    "可以修改收货地址吗？",
]

# 2. 代码助手场景
CODE_ASSISTANT_PROMPTS = [
    "写一个Python函数，实现列表去重。",
    "解释一下这段代码的作用：def f(x): return x*x",
    "如何优化这个SQL查询？",
    "写一个正则表达式匹配邮箱。",
    "实现一个简单的HTTP客户端。",
]

# 3. 文档写作场景
DOCUMENT_WRITING_PROMPTS = [
    "请帮我写一封商务邮件。",
    "为这个产品写一段简短的介绍。",
    "帮我润色这段文字。",
    "写一个项目进度报告模板。",
    "生成一份会议纪要。",
]

# 4. 数据分析场景
DATA_ANALYSIS_PROMPTS = [
    "解释一下什么是标准差。",
    "如何处理缺失数据？",
    "写一个Python脚本分析CSV文件。",
    "解释A/B测试的原理。",
    "什么是时间序列分析？",
]

# 5. 教育辅导场景
EDUCATION_PROMPTS = [
    "请解释什么是递归。",
    "解释一下牛顿第二定律。",
    "什么是数据库索引？",
    "解释面向对象编程的概念。",
    "什么是机器学习？",
]


# ===========================================
# 场景化用户类
# ===========================================

class CustomerServiceUser(HttpUser):
    """模拟客服场景用户"""
    wait_time = between(2, 5)

    @task
    def ask_question(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(CUSTOMER_SERVICE_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/customer-service"
        )


class CodeAssistantUser(HttpUser):
    """模拟代码助手用户"""
    wait_time = between(3, 8)

    @task
    def code_task(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(CODE_ASSISTANT_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_long"],
            "temperature": 0.3,  # 代码生成用低温度
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/code-assistant"
        )


class DocumentWriterUser(HttpUser):
    """模拟文档写作用户"""
    wait_time = between(5, 15)

    @task
    def write_document(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(DOCUMENT_WRITING_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_long"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/document-writing"
        )


class DataAnalystUser(HttpUser):
    """模拟数据分析用户"""
    wait_time = between(4, 10)

    @task
    def analyze(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(DATA_ANALYSIS_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/data-analysis"
        )


class EducationUser(HttpUser):
    """模拟教育辅导用户"""
    wait_time = between(3, 7)

    @task
    def learn(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(EDUCATION_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/education"
        )


# ===========================================
# 混合场景用户 (综合测试)
# ===========================================

class MixedWorkloadUser(HttpUser):
    """
    混合场景用户 - 按权重模拟真实业务场景

    权重分配:
        - 客服问答: 40%
        - 代码助手: 20%
        - 文档写作: 15%
        - 数据分析: 15%
        - 教育辅导: 10%
    """
    wait_time = between(2, 6)

    @task(40)
    def customer_service(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(CUSTOMER_SERVICE_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/mixed/customer-service"
        )

    @task(20)
    def code_assistant(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(CODE_ASSISTANT_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_long"],
            "temperature": 0.3,
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/mixed/code-assistant"
        )

    @task(15)
    def document_writing(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(DOCUMENT_WRITING_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_long"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/mixed/document-writing"
        )

    @task(15)
    def data_analysis(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(DATA_ANALYSIS_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/mixed/data-analysis"
        )

    @task(10)
    def education(self):
        payload = {
            "model": CONFIG["model"],
            "messages": [
                {"role": "user", "content": random.choice(EDUCATION_PROMPTS)}
            ],
            "max_tokens": CONFIG["max_tokens_medium"],
            "stream": CONFIG["streaming"]
        }
        self.client.post(
            "/v1/chat/completions",
            data=json.dumps(payload),
            headers=DEFAULT_HEADERS,
            name="/mixed/education"
        )


# ===========================================
# 报告生成
# ===========================================

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """生成测试报告"""
    if isinstance(environment.runner, MasterRunner):
        stats = environment.stats

        report = f"""
{'='*70}
                        LLM 压力测试报告
{'='*70}

测试时间: {time.strftime('%Y-%m-%d %H:%M:%S')}
模型: {CONFIG['model']}
流式模式: {CONFIG['streaming']}

{'='*70}
                          总体统计
{'='*70}

总请求数:       {stats.total.num_requests:>10}
失败请求:       {stats.total.num_failures:>10}
失败率:         {stats.total.fail_ratio*100:>9.2f}%
吞吐量 (RPS):   {stats.total.total_rps:>9.2f}

{'='*70}
                          响应时间
{'='*70}

平均值:         {stats.total.avg_response_time:>9.2f} ms
最小值:         {stats.total.min_response_time:>9.2f} ms
最大值:         {stats.total.max_response_time:>9.2f} ms
中位数:         {stats.total.median_response_time:>9.2f} ms
P95:            {stats.total.get_response_time_percentile(0.95):>9.2f} ms
P99:            {stats.total.get_response_time_percentile(0.99):>9.2f} ms

{'='*70}
                          各端点统计
{'='*70}
"""
        print(report)

        # 打印各端点统计
        for name, entry in stats.entries.items():
            if entry.num_requests > 0:
                print(f"\n{name}:")
                print(f"  请求数: {entry.num_requests}")
                print(f"  失败数: {entry.num_failures}")
                print(f"  平均延迟: {entry.avg_response_time:.2f}ms")
                print(f"  P95: {entry.get_response_time_percentile(0.95):.2f}ms")

        print("\n" + "="*70)