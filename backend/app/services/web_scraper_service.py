"""
增强版网页爬取服务
支持：
1. JavaScript 渲染（Playwright）
2. 智能内容提取（Trafilatura）
3. 反爬虫绕过
4. 优雅降级
"""
import os
import asyncio
import random
from typing import Optional, Dict
from bs4 import BeautifulSoup
import httpx


class WebScraperService:
    """增强版网页爬取服务"""
    
    def __init__(self):
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        ]
        
        # 检查是否安装了高级依赖
        self.has_playwright = self._check_playwright()
        self.has_trafilatura = self._check_trafilatura()
        
        print(f"[Scraper] 初始化完成")
        print(f"  - Playwright (JS渲染): {'OK' if self.has_playwright else 'NO'}")
        print(f"  - Trafilatura (智能提取): {'OK' if self.has_trafilatura else 'NO'}")
    
    def _check_playwright(self) -> bool:
        """检查 Playwright 是否可用"""
        try:
            from playwright.async_api import async_playwright
            return True
        except ImportError:
            return False
    
    def _check_trafilatura(self) -> bool:
        """检查 Trafilatura 是否可用"""
        try:
            import trafilatura
            return True
        except ImportError:
            return False
    
    def _get_random_user_agent(self) -> str:
        """获取随机 User-Agent"""
        return random.choice(self.user_agents)
    
    async def scrape(self, url: str, use_js: bool = True) -> Dict:
        """
        爬取网页内容（智能选择最佳方案）
        
        Args:
            url: 网页 URL
            use_js: 是否尝试使用 JS 渲染（默认 True）
        
        Returns:
            {
                "title": str,
                "content": str,
                "method": str,  # basic, trafilatura, playwright
                "success": bool
            }
        """
        print(f"[Scraper] 开始爬取: {url}")
        
        # 策略 1: 尝试智能提取（Trafilatura）
        if self.has_trafilatura:
            result = await self._scrape_with_trafilatura(url)
            if result["success"]:
                print(f"[Scraper] ✓ Trafilatura 提取成功")
                return result
            print(f"[Scraper] ✗ Trafilatura 失败，尝试下一个方案")
        
        # 策略 2: 尝试 JS 渲染（Playwright）
        if use_js and self.has_playwright:
            result = await self._scrape_with_playwright(url)
            if result["success"]:
                print(f"[Scraper] ✓ Playwright 渲染成功")
                return result
            print(f"[Scraper] ✗ Playwright 失败，尝试基础方案")
        
        # 策略 3: 基础爬取（httpx + BeautifulSoup）
        result = await self._scrape_basic(url)
        if result["success"]:
            print(f"[Scraper] ✓ 基础爬取成功")
        else:
            print(f"[Scraper] ✗ 所有方案均失败")
        
        return result
    
    async def _scrape_with_trafilatura(self, url: str) -> Dict:
        """使用 Trafilatura 智能提取（最推荐）"""
        try:
            import trafilatura
            
            # 下载网页
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return {"success": False, "method": "trafilatura"}
            
            # 提取内容
            content = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=True,
                no_fallback=False
            )
            
            if not content or len(content.strip()) < 50:
                return {"success": False, "method": "trafilatura"}
            
            # 提取元数据
            metadata = trafilatura.extract_metadata(downloaded)
            title = metadata.title if metadata and metadata.title else url.split('//')[-1].split('/')[0]
            
            return {
                "success": True,
                "method": "trafilatura",
                "title": title,
                "content": content,
                "metadata": {
                    "author": metadata.author if metadata else None,
                    "date": metadata.date if metadata else None,
                    "description": metadata.description if metadata else None
                }
            }
        except Exception as e:
            print(f"[Scraper] Trafilatura 错误: {e}")
            return {"success": False, "method": "trafilatura"}
    
    async def _scrape_with_playwright(self, url: str) -> Dict:
        """使用 Playwright 渲染 JS（适合动态网站）"""
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                # 启动浏览器（无头模式）
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self._get_random_user_agent(),
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                # 访问页面
                await page.goto(url, wait_until='networkidle', timeout=30000)
                
                # 等待内容加载
                await asyncio.sleep(2)
                
                # 获取标题
                title = await page.title()
                
                # 获取页面内容
                html = await page.content()
                
                await browser.close()
            
            # 使用 BeautifulSoup 清理内容
            soup = BeautifulSoup(html, 'html.parser')
            
            # 移除无用标签
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                tag.decompose()
            
            # 提取文本
            text = soup.get_text(separator='\n', strip=True)
            
            # 清理空行
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            content = '\n'.join(lines)
            
            if not content or len(content.strip()) < 50:
                return {"success": False, "method": "playwright"}
            
            return {
                "success": True,
                "method": "playwright",
                "title": title or url.split('//')[-1].split('/')[0],
                "content": content
            }
        except Exception as e:
            print(f"[Scraper] Playwright 错误: {e}")
            return {"success": False, "method": "playwright"}
    
    async def _scrape_basic(self, url: str) -> Dict:
        """基础爬取（httpx + BeautifulSoup）"""
        try:
            # 获取网页内容（跳过 SSL 验证）
            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                verify=False
            ) as client:
                response = await client.get(url, headers={
                    'User-Agent': self._get_random_user_agent()
                })
                response.raise_for_status()
                html = response.text
            
            # 解析 HTML
            soup = BeautifulSoup(html, 'html.parser')
            
            # 提取标题
            title = soup.find('title')
            title_text = title.get_text().strip() if title else url.split('//')[-1].split('/')[0]
            
            # 移除无用标签
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                tag.decompose()
            
            # 提取文本
            text = soup.get_text(separator='\n', strip=True)
            
            # 清理空行和去重
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            seen = set()
            unique_lines = []
            for line in lines:
                if line not in seen or len(line) > 50:
                    unique_lines.append(line)
                    if len(line) < 50:
                        seen.add(line)
            
            content = '\n'.join(unique_lines)
            
            if not content or len(content.strip()) < 50:
                return {"success": False, "method": "basic"}
            
            return {
                "success": True,
                "method": "basic",
                "title": title_text,
                "content": content
            }
        except Exception as e:
            print(f"[Scraper] 基础爬取错误: {e}")
            return {"success": False, "method": "basic", "error": str(e)}


# 创建全局实例
web_scraper_service = WebScraperService()
