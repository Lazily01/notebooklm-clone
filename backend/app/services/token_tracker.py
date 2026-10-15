"""
Token 使用追踪器 - 透明化成本统计

统计维度：
1. 文档解析（OCR、图片识别等）
2. 向量化（文档、查询）
3. LLM 调用（摘要、聊天）
4. 总计和分类
"""
from typing import Dict, Optional
from datetime import datetime
import json


class TokenTracker:
    """Token 使用追踪器"""
    
    def __init__(self):
        """初始化统计数据"""
        self.stats = {
            # 文档解析
            "parsing": {
                "pdf_ocr": {"tokens": 0, "cost": 0, "count": 0},
                "image_recognition": {"tokens": 0, "cost": 0, "count": 0},
                "word_parsing": {"tokens": 0, "cost": 0, "count": 0},
                "excel_parsing": {"tokens": 0, "cost": 0, "count": 0},
            },
            # 向量化
            "vectorization": {
                "document": {"tokens": 0, "cost": 0, "count": 0},
                "query": {"tokens": 0, "cost": 0, "count": 0},
                "cached_query": {"count": 0, "saved_cost": 0},  # 缓存命中
            },
            # LLM 调用
            "llm": {
                "summary": {"input_tokens": 0, "output_tokens": 0, "cost": 0, "count": 0},
                "chat": {"input_tokens": 0, "output_tokens": 0, "cost": 0, "count": 0},
            },
            # 总计
            "total": {
                "tokens": 0,
                "cost": 0,
                "start_time": datetime.now().isoformat()
            }
        }
        
        # 价格表（元/千tokens）
        self.prices = {
            "qwen-long": {"input": 0.0005, "output": 0.002},
            "qwen-vl-max": {"input": 0.008, "output": 0.008},
            "text-embedding-v4": 0.0007,
        }
    
    def track_parsing(self, type: str, tokens: int, model: str = "qwen-long"):
        """
        追踪文档解析 Token
        
        Args:
            type: 解析类型（pdf_ocr, image_recognition, word_parsing, excel_parsing）
            tokens: 消耗的 tokens
            model: 使用的模型
        """
        if type not in self.stats["parsing"]:
            return
        
        # 计算成本
        if model == "qwen-long":
            cost = tokens / 1000 * self.prices["qwen-long"]["input"]
        elif model == "qwen-vl-max":
            cost = tokens / 1000 * self.prices["qwen-vl-max"]["input"]
        else:
            cost = 0
        
        # 更新统计
        self.stats["parsing"][type]["tokens"] += tokens
        self.stats["parsing"][type]["cost"] += cost
        self.stats["parsing"][type]["count"] += 1
        
        # 更新总计
        self.stats["total"]["tokens"] += tokens
        self.stats["total"]["cost"] += cost
        
        print(f"[Token] {type}: {tokens} tokens, 成本: {cost:.4f}元")
    
    def track_vectorization(self, type: str, tokens: int, cached: bool = False):
        """
        追踪向量化 Token
        
        Args:
            type: 向量化类型（document, query）
            tokens: 消耗的 tokens
            cached: 是否命中缓存
        """
        if cached:
            # 缓存命中，不消耗 tokens
            self.stats["vectorization"]["cached_query"]["count"] += 1
            saved_cost = tokens / 1000 * self.prices["text-embedding-v4"]
            self.stats["vectorization"]["cached_query"]["saved_cost"] += saved_cost
            print(f"[Token] 查询缓存命中，节省: {saved_cost:.4f}元")
            return
        
        if type not in self.stats["vectorization"]:
            return
        
        # 计算成本
        cost = tokens / 1000 * self.prices["text-embedding-v4"]
        
        # 更新统计
        self.stats["vectorization"][type]["tokens"] += tokens
        self.stats["vectorization"][type]["cost"] += cost
        self.stats["vectorization"][type]["count"] += 1
        
        # 更新总计
        self.stats["total"]["tokens"] += tokens
        self.stats["total"]["cost"] += cost
        
        print(f"[Token] 向量化-{type}: {tokens} tokens, 成本: {cost:.4f}元")
    
    def track_llm(self, type: str, input_tokens: int, output_tokens: int, model: str = "qwen-long"):
        """
        追踪 LLM 调用 Token
        
        Args:
            type: 调用类型（summary, chat）
            input_tokens: 输入 tokens
            output_tokens: 输出 tokens
            model: 使用的模型
        """
        if type not in self.stats["llm"]:
            return
        
        # 计算成本
        input_cost = input_tokens / 1000 * self.prices[model]["input"]
        output_cost = output_tokens / 1000 * self.prices[model]["output"]
        total_cost = input_cost + output_cost
        
        # 更新统计
        self.stats["llm"][type]["input_tokens"] += input_tokens
        self.stats["llm"][type]["output_tokens"] += output_tokens
        self.stats["llm"][type]["cost"] += total_cost
        self.stats["llm"][type]["count"] += 1
        
        # 更新总计
        self.stats["total"]["tokens"] += (input_tokens + output_tokens)
        self.stats["total"]["cost"] += total_cost
        
        print(f"[Token] LLM-{type}: 输入{input_tokens} + 输出{output_tokens} = {total_cost:.4f}元")
    
    def get_summary(self) -> Dict:
        """
        获取统计摘要
        
        Returns:
            统计摘要字典
        """
        # 计算各类别占比
        total_cost = self.stats["total"]["cost"]
        
        parsing_cost = sum(item["cost"] for item in self.stats["parsing"].values())
        vectorization_cost = sum(item["cost"] for item in self.stats["vectorization"].values() if "cost" in item)
        llm_cost = sum(item["cost"] for item in self.stats["llm"].values())
        
        return {
            "total": {
                "tokens": self.stats["total"]["tokens"],
                "cost": round(total_cost, 4),
                "cost_yuan": f"{total_cost:.4f}元"
            },
            "breakdown": {
                "parsing": {
                    "cost": round(parsing_cost, 4),
                    "percentage": f"{parsing_cost/total_cost*100:.1f}%" if total_cost > 0 else "0%",
                    "details": self.stats["parsing"]
                },
                "vectorization": {
                    "cost": round(vectorization_cost, 4),
                    "percentage": f"{vectorization_cost/total_cost*100:.1f}%" if total_cost > 0 else "0%",
                    "details": self.stats["vectorization"]
                },
                "llm": {
                    "cost": round(llm_cost, 4),
                    "percentage": f"{llm_cost/total_cost*100:.1f}%" if total_cost > 0 else "0%",
                    "details": self.stats["llm"]
                }
            },
            "savings": {
                "cached_queries": self.stats["vectorization"]["cached_query"]["count"],
                "saved_cost": round(self.stats["vectorization"]["cached_query"]["saved_cost"], 4)
            },
            "start_time": self.stats["total"]["start_time"]
        }
    
    def print_summary(self):
        """打印统计摘要（格式化输出）"""
        summary = self.get_summary()
        
        print("\n" + "="*60)
        print("📊 Token 使用统计")
        print("="*60)
        
        print(f"\n💰 总成本: {summary['total']['cost_yuan']}")
        print(f"🔢 总 Tokens: {summary['total']['tokens']:,}")
        
        print("\n📈 成本分布:")
        print(f"  📄 文档解析: {summary['breakdown']['parsing']['cost']:.4f}元 ({summary['breakdown']['parsing']['percentage']})")
        print(f"  🔍 向量化: {summary['breakdown']['vectorization']['cost']:.4f}元 ({summary['breakdown']['vectorization']['percentage']})")
        print(f"  💬 LLM 调用: {summary['breakdown']['llm']['cost']:.4f}元 ({summary['breakdown']['llm']['percentage']})")
        
        print("\n💾 缓存节省:")
        print(f"  命中次数: {summary['savings']['cached_queries']}")
        print(f"  节省成本: {summary['savings']['saved_cost']:.4f}元")
        
        print("\n⏰ 统计开始时间: {summary['start_time']}")
        print("="*60 + "\n")
    
    def reset(self):
        """重置统计数据"""
        self.__init__()
        print("[Token] 统计数据已重置")


# 全局单例
token_tracker = TokenTracker()
