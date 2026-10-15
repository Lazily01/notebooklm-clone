"""
统一的缓存服务 - 管理所有工作室功能的缓存
"""
import json
import time
from typing import Optional, Dict, Any
from pathlib import Path


class CacheService:
    """缓存服务"""
    
    def __init__(self, cache_dir: str = "cache"):
        """
        初始化缓存服务
        
        Args:
            cache_dir: 缓存目录
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # 内存缓存（快速访问）
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        
        # 缓存过期时间（秒）
        self.cache_ttl = {
            "summary": 7 * 24 * 3600,      # 摘要：7天
            "outline": 7 * 24 * 3600,      # 大纲：7天
            "flashcards": 7 * 24 * 3600,   # 闪卡：7天
            "quiz": 7 * 24 * 3600,         # 测验：7天
            "mindmap": 7 * 24 * 3600,      # 思维导图：7天
            "infographic": 3 * 24 * 3600,  # 信息图：3天
            "report": 3 * 24 * 3600,       # 报告：3天
        }
        
        # 统计信息
        self.stats = {
            "hits": 0,
            "misses": 0,
            "saves": 0
        }
    
    def _get_cache_key(self, doc_id: str, cache_type: str) -> str:
        """生成缓存键"""
        return f"{doc_id}_{cache_type}"
    
    def _get_cache_file(self, cache_key: str) -> Path:
        """获取缓存文件路径"""
        return self.cache_dir / f"{cache_key}.json"
    
    def get(self, doc_id: str, cache_type: str) -> Optional[Any]:
        """
        获取缓存
        
        Args:
            doc_id: 文档ID
            cache_type: 缓存类型（summary, outline, flashcards, quiz等）
        
        Returns:
            缓存的内容，如果不存在或过期返回 None
        """
        cache_key = self._get_cache_key(doc_id, cache_type)
        
        # 1. 先查内存缓存
        if cache_key in self.memory_cache:
            cache_data = self.memory_cache[cache_key]
            if self._is_valid(cache_data, cache_type):
                self.stats["hits"] += 1
                print(f"[Cache] 命中内存缓存: {cache_key}")
                return cache_data["content"]
            else:
                # 过期，删除
                del self.memory_cache[cache_key]
        
        # 2. 查文件缓存
        cache_file = self._get_cache_file(cache_key)
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                if self._is_valid(cache_data, cache_type):
                    # 加载到内存缓存
                    self.memory_cache[cache_key] = cache_data
                    self.stats["hits"] += 1
                    print(f"[Cache] 命中文件缓存: {cache_key}")
                    return cache_data["content"]
                else:
                    # 过期，删除文件
                    cache_file.unlink()
            except Exception as e:
                print(f"[Cache] 读取缓存失败: {e}")
        
        # 3. 未命中
        self.stats["misses"] += 1
        print(f"[Cache] 未命中: {cache_key}")
        return None
    
    def set(self, doc_id: str, cache_type: str, content: Any) -> None:
        """
        设置缓存
        
        Args:
            doc_id: 文档ID
            cache_type: 缓存类型
            content: 要缓存的内容
        """
        cache_key = self._get_cache_key(doc_id, cache_type)
        
        cache_data = {
            "content": content,
            "cached_at": time.time(),
            "doc_id": doc_id,
            "type": cache_type
        }
        
        # 1. 保存到内存
        self.memory_cache[cache_key] = cache_data
        
        # 2. 保存到文件
        cache_file = self._get_cache_file(cache_key)
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
            self.stats["saves"] += 1
            print(f"[Cache] 保存缓存: {cache_key}")
        except Exception as e:
            print(f"[Cache] 保存缓存失败: {e}")
    
    def invalidate(self, doc_id: str, cache_type: Optional[str] = None) -> None:
        """
        使缓存失效
        
        Args:
            doc_id: 文档ID
            cache_type: 缓存类型，如果为 None 则删除该文档的所有缓存
        """
        if cache_type:
            # 删除特定类型的缓存
            cache_key = self._get_cache_key(doc_id, cache_type)
            
            # 删除内存缓存
            if cache_key in self.memory_cache:
                del self.memory_cache[cache_key]
            
            # 删除文件缓存
            cache_file = self._get_cache_file(cache_key)
            if cache_file.exists():
                cache_file.unlink()
            
            print(f"[Cache] 删除缓存: {cache_key}")
        else:
            # 删除该文档的所有缓存
            for ct in self.cache_ttl.keys():
                self.invalidate(doc_id, ct)
    
    def _is_valid(self, cache_data: Dict, cache_type: str) -> bool:
        """检查缓存是否有效（未过期）"""
        cached_at = cache_data.get("cached_at", 0)
        ttl = self.cache_ttl.get(cache_type, 24 * 3600)  # 默认24小时
        
        return (time.time() - cached_at) < ttl
    
    def get_stats(self) -> Dict:
        """获取缓存统计信息"""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0
        
        return {
            **self.stats,
            "hit_rate": f"{hit_rate:.1f}%",
            "memory_cache_size": len(self.memory_cache)
        }
    
    def clear_all(self) -> None:
        """清空所有缓存"""
        # 清空内存缓存
        self.memory_cache.clear()
        
        # 清空文件缓存
        for cache_file in self.cache_dir.glob("*.json"):
            cache_file.unlink()
        
        print(f"[Cache] 已清空所有缓存")


# 全局实例
cache_service = CacheService()
