"""使用 Markmap 渲染思维导图为图片"""
import asyncio
import sys
import time
from pathlib import Path
from typing import Tuple
import hashlib
from datetime import datetime
import subprocess
import shutil
import multiprocessing


def _screenshot_process(html_path: str, output_path: str, width: int, height: int):
    """在独立进程中运行的截图函数"""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.goto(f"file://{html_path}")
        page.wait_for_load_state('networkidle')
        time.sleep(1)  # 等待 Markmap 渲染
        page.screenshot(path=output_path, full_page=False)
        browser.close()


class MindmapMarkmapRenderer:
    """使用 Markmap CLI 渲染思维导图"""
    
    def __init__(self, output_dir: str = "static/mindmaps"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 检查 markmap-cli 是否安装
        self.markmap_cli = self._check_markmap_cli()
    
    def _check_markmap_cli(self) -> str:
        """检查 markmap-cli 是否安装"""
        # 尝试查找 markmap 命令
        markmap_path = shutil.which('markmap')
        if markmap_path:
            return markmap_path
        
        # 尝试 npx markmap
        npx_path = shutil.which('npx')
        if npx_path:
            return 'npx markmap'
        
        raise FileNotFoundError(
            "未找到 markmap-cli。请安装：npm install -g markmap-cli"
        )
    
    async def render_to_image(self, markdown: str, filename: str = None, 
                             width: int = 1920, height: int = 1080) -> Tuple[str, str]:
        """渲染思维导图为图片"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            content_hash = hashlib.md5(markdown.encode()).hexdigest()[:8]
            filename = f"mindmap_{timestamp}_{content_hash}"
        
        # 保存 Markdown 文件
        md_file = self.output_dir / f"{filename}.md"
        md_file.write_text(markdown, encoding='utf-8')
        
        # 生成 HTML 文件
        html_file = self.output_dir / f"{filename}.html"
        
        try:
            # 使用 markmap-cli 生成 HTML
            cmd = f'{self.markmap_cli} "{md_file}" -o "{html_file}"'
            result = subprocess.run(
                cmd, 
                shell=True, 
                capture_output=True, 
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"Markmap 生成失败: {result.stderr}")
            
            print(f"[OK] Markmap HTML 生成成功: {html_file}")
            
            # 使用 multiprocessing 创建真正独立的进程（完全隔离事件循环）
            output_file = self.output_dir / f"{filename}.png"
            
            print(f"[DEBUG] 开始截图（独立进程）...")
            
            # 创建独立进程运行 Playwright
            process = multiprocessing.Process(
                target=_screenshot_process,
                args=(
                    str(html_file.absolute()),
                    str(output_file.absolute()),
                    width,
                    height
                )
            )
            process.start()
            process.join(timeout=60)  # 最多等待60秒
            
            if process.is_alive():
                process.terminate()
                raise RuntimeError("截图进程超时")
            
            if process.exitcode != 0:
                raise RuntimeError(f"截图进程失败，退出码: {process.exitcode}")
            
            if not output_file.exists():
                raise RuntimeError(f"截图文件未生成: {output_file}")
            
            print(f"[OK] 截图保存: {output_file}")
            
            return str(output_file), f"mindmaps/{filename}.png"
            
        except Exception as e:
            print(f"[ERROR] 渲染失败: {e}")
            raise
