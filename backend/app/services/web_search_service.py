"""
联网搜索服务 - 搜索 + 网页爬取
使用：
1. 博查AI搜索（国内最佳方案 - 免费额度充足）
2. BeautifulSoup（网页内容提取 - 免费、国内可用、稳定）
"""
import httpx
import os
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import requests
import re
import json


class WebSearchService:
    """联网搜索和网页爬取服务"""
    
    def __init__(self):
        # 博查AI搜索 API
        self.bocha_api_key = os.getenv("BOCHA_API_KEY", "")
        self.bocha_endpoint = "https://api.bocha.cn/v1/web-search"
        
        # User-Agent
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
    async def search_web(self, query: str, count: int = 5) -> List[Dict]:
        """
        搜索网页（博查AI搜索 - 国内最佳方案）
        
        博查AI搜索优势：
        - 国内服务，速度快，内容合规
        - 免费额度充足（注册即送）
        - 搜索结果质量高，适合AI使用
        - 支持长文本摘要
        - 0.15s 极速响应
        - 已服务 DeepSeek、阿里、腾讯等
        
        Args:
            query: 搜索关键词
            count: 返回结果数量（最多50）
            
        Returns:
            [
                {
                    "title": "标题",
                    "url": "链接",
                    "snippet": "摘要"
                },
                ...
            ]
        """
        if not self.bocha_api_key:
            print("[Search] 错误：未配置 BOCHA_API_KEY")
            print("[Search] 请前往 https://open.bocha.cn 注册并获取 API Key")
            return []
        
        try:
            print(f"[Search] 使用博查AI搜索: {query}")
            
            # 博查AI搜索 API
            headers = {
                "Authorization": f"Bearer {self.bocha_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "query": query,
                "summary": True,  # 输出长文本摘要
                "freshness": "noLimit",  # 不限制时间范围
                "count": min(count, 50)  # 最多50条
            }
            
            # 发送请求
            response = requests.post(
                self.bocha_endpoint,
                headers=headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code != 200:
                print(f"[Search] 博查AI返回错误: {response.status_code}")
                print(f"[Search] 响应: {response.text}")
                return []
            
            # 解析 JSON（博查AI返回格式）
            data = response.json()
            
            # 检查返回状态
            if data.get("code") != 200:
                error_msg = data.get("message", "Unknown error")
                print(f"[Search] 博查AI错误: {error_msg}")
                return []
            
            results = []
            
            # 博查AI返回的数据在 data.data 中
            search_data = data.get("data", {})
            
            # 提取网页结果
            if "webPages" in search_data and "value" in search_data["webPages"]:
                for item in search_data["webPages"]["value"]:
                    title = item.get("name", "")
                    url = item.get("url", "")
                    # 优先使用 summary（长文本），否则使用 snippet
                    snippet = item.get("summary", "") or item.get("snippet", "")
                    
                    # 清理摘要
                    snippet = re.sub(r'\s+', ' ', snippet).strip()
                    
                    if title and url:
                        results.append({
                            "title": title,
                            "url": url,
                            "snippet": snippet,
                            # 额外信息（可选）
                            "siteName": item.get("siteName", ""),
                            "datePublished": item.get("datePublished", "")
                        })
            
            print(f"[Search] 找到 {len(results)} 个结果")
            return results
                
        except Exception as e:
            print(f"[Search] 搜索异常: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    async def fetch_webpage_content(self, url: str) -> Optional[Dict]:
        """
        爬取网页内容（使用 BeautifulSoup - 免费、稳定、国内可用）
        
        Args:
            url: 网页链接
            
        Returns:
            {
                "title": "标题",
                "content": "正文内容",
                "url": "链接"
            }
        """
        try:
            print(f"[Fetch] 开始爬取: {url}")
            
            # 增强 headers，模拟真实浏览器
            fetch_headers = {
                **self.headers,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            # 发送请求（增加超时时间，添加重试）
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    response = requests.get(
                        url, 
                        headers=fetch_headers, 
                        timeout=20,  # 增加到20秒
                        allow_redirects=True
                    )
                    break  # 成功则跳出
                except requests.exceptions.Timeout:
                    if attempt < max_retries - 1:
                        print(f"[Fetch] 超时，重试 {attempt + 1}/{max_retries}")
                        continue
                    else:
                        print(f"[Fetch] 超时失败: {url}")
                        return None
            response.encoding = response.apparent_encoding
            
            if response.status_code != 200:
                print(f"[Fetch] HTTP 错误: {response.status_code}")
                return None
            
            # 解析 HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取标题
            title = "无标题"
            if soup.title and soup.title.string:
                title = soup.title.string.strip()
            elif soup.find('h1'):
                title = soup.find('h1').get_text().strip()
            
            # 移除不需要的标签
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe", "noscript"]):
                tag.decompose()
            
            # 尝试找到主要内容区域
            main_content = None
            
            # 常见的内容容器标签
            content_selectors = [
                'article',
                '[class*="content"]',
                '[class*="article"]',
                '[class*="post"]',
                '[id*="content"]',
                '[id*="article"]',
                'main',
                '.markdown-body',  # GitHub 等
            ]
            
            for selector in content_selectors:
                main_content = soup.select_one(selector)
                if main_content:
                    break
            
            # 如果没找到特定容器，使用 body
            if not main_content:
                main_content = soup.find('body')
            
            if not main_content:
                print(f"[Fetch] 无法找到内容区域")
                return None
            
            # 提取文本
            text = main_content.get_text()
            
            # 清理文本
            # 1. 移除多余空行
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            # 2. 移除过短的行（可能是导航、按钮等）
            lines = [line for line in lines if len(line) > 10]
            # 3. 合并
            content = '\n'.join(lines)
            
            # 进一步清理：移除多余空格
            content = re.sub(r'\s+', ' ', content)
            content = content.strip()
            
            # 验证内容
            if len(content) < 100:
                print(f"[Fetch] 内容过短: {len(content)} 字符")
                return None
            
            print(f"[Fetch] 爬取成功: {title} ({len(content)} 字符)")
            
            return {
                "title": title,
                "content": content,
                "url": url
            }
                
        except Exception as e:
            print(f"[Fetch] 爬取失败 {url}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def search_and_fetch(self, query: str, max_pages: int = 3) -> List[Dict]:
        """
        搜索并爬取网页内容（一站式）
        
        Args:
            query: 搜索关键词
            max_pages: 最多爬取几个网页
            
        Returns:
            [
                {
                    "title": "标题",
                    "content": "正文",
                    "url": "链接",
                    "snippet": "搜索摘要"
                },
                ...
            ]
        """
        print(f"[WebSearch] 开始搜索: {query}")
        
        # 1. 搜索
        search_results = await self.search_web(query, count=max_pages * 2)
        
        if not search_results:
            print("[WebSearch] 未找到搜索结果")
            return []
        
        # 2. 爬取前 N 个网页
        fetched_results = []
        for i, result in enumerate(search_results[:max_pages]):
            print(f"[WebSearch] 爬取 {i+1}/{max_pages}: {result['url']}")
            
            content_data = await self.fetch_webpage_content(result['url'])
            
            if content_data:
                fetched_results.append({
                    "title": content_data["title"],
                    "content": content_data["content"],
                    "url": content_data["url"],
                    "snippet": result.get("snippet", "")
                })
        
        print(f"[WebSearch] 完成，成功爬取 {len(fetched_results)} 个网页")
        return fetched_results


# 全局单例
web_search_service = WebSearchService()
