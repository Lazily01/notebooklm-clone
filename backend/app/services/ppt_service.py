"""
PPT 生成服务 - 移植自 LandPPT 核心功能
支持：大纲生成、大纲编辑、幻灯片内容生成、HTML 预览、PPT 导出
"""

import json
import re
import logging
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class PPTProject:
    """PPT 项目数据结构"""
    def __init__(self, project_id: str, topic: str, content: str, scenario: str = "general", doc_id: str = None):
        self.project_id = project_id
        self.topic = topic
        self.content = content  # 文档内容
        self.scenario = scenario
        self.doc_id = doc_id  # 文档ID（用于 RAG）
        self.outline = None  # 大纲数据
        self.slides_html = []  # 生成的幻灯片 HTML
        self.status = "created"  # created -> outline_generated -> slides_generated
        self.created_at = datetime.now()
        self.updated_at = datetime.now()


class PPTService:
    """PPT 生成服务"""
    
    # 项目存储
    projects: Dict[str, PPTProject] = {}
    
    # 场景配置
    SCENARIO_CONFIGS = {
        "general": {
            "name": "通用演示",
            "color_scheme": "#2E86AB",
            "font_family": "Arial, sans-serif"
        },
        "business": {
            "name": "商务汇报",
            "color_scheme": "#1F4E79",
            "font_family": "Calibri, sans-serif"
        },
        "technology": {
            "name": "科技展示",
            "color_scheme": "#9B59B6",
            "font_family": "Roboto, sans-serif"
        },
        "education": {
            "name": "教育培训",
            "color_scheme": "#E74C3C",
            "font_family": "Georgia, serif"
        },
        "academic": {
            "name": "学术报告",
            "color_scheme": "#8B4513",
            "font_family": "Times New Roman, serif"
        }
    }
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
    
    async def create_project(self, topic: str, content: str, scenario: str = "general", doc_id: str = None) -> PPTProject:
        """创建 PPT 项目"""
        project_id = str(uuid.uuid4())[:8]
        project = PPTProject(project_id, topic, content, scenario, doc_id)
        self.projects[project_id] = project
        logger.info(f"[PPT] 创建项目: {project_id}, 主题: {topic}, doc_id: {doc_id}")
        return project
    
    def get_project(self, project_id: str) -> Optional[PPTProject]:
        """获取项目"""
        return self.projects.get(project_id)
    
    async def generate_outline(self, project_id: str, page_count: int = 10, 
                               target_audience: str = "普通大众",
                               ppt_style: str = "general",
                               use_rag: bool = True) -> Dict[str, Any]:
        """
        生成 PPT 大纲（优先使用 RAG）
        
        Args:
            project_id: 项目 ID
            page_count: 目标页数
            target_audience: 目标受众
            ppt_style: PPT 风格
            use_rag: 是否使用 RAG
            
        Returns:
            大纲数据 {"title": "...", "slides": [...], "metadata": {...}}
        """
        project = self.get_project(project_id)
        if not project:
            raise ValueError("项目不存在")
        
        # 获取文档内容
        content = project.content
        
        # 尝试使用 RAG 优化内容
        if use_rag and hasattr(project, 'doc_id') and project.doc_id:
            try:
                from .llm_service import LLMService
                llm = LLMService()
                rag_content = await llm._get_rag_content(
                    doc_id=project.doc_id,
                    queries=[
                        "文档的整体结构和主要章节是什么？",
                        "文档的核心内容和关键要点有哪些？",
                        "文档的结论和重要观点是什么？"
                    ],
                    max_chunks=12
                )
                if rag_content:
                    content = rag_content
                    logger.info(f"[PPT] 使用 RAG 内容生成大纲")
            except Exception as e:
                logger.warning(f"[PPT] RAG 检索失败，使用原始内容: {e}")
        
        # 如果内容过长，截断
        if len(content) > 8000:
            content = content[:8000]
            logger.info(f"[PPT] 内容过长，截取前 8000 字符")
        
        scenario_config = self.SCENARIO_CONFIGS.get(project.scenario, self.SCENARIO_CONFIGS["general"])
        
        prompt = f"""你是一位专业的PPT大纲策划专家，请基于以下文档内容，生成一个结构清晰、内容专业的PPT大纲。

### 📌【项目信息】：
- **主题**：{project.topic}
- **应用场景**：{scenario_config['name']}
- **目标受众**：{target_audience}
- **PPT风格**：{ppt_style}

### 📄【页数要求】：
- 必须生成恰好 {page_count} 页的PPT

### 📋【大纲生成规则】：

1. **页面结构规范**：
   - 第1页：封面页（标题 + 副标题）
   - 第2页：目录页（列出主要章节）
   - 第3-{page_count-1}页：内容页
   - 第{page_count}页：结论/感谢页

2. **内容点控制**：
   - 每页控制在3～5个内容要点
   - 每个要点简洁清晰，不超过30字

3. **输出格式**：
请严格使用如下JSON格式输出：

```json
{{
  "title": "PPT标题",
  "slides": [
    {{
      "page_number": 1,
      "title": "页面标题",
      "content_points": ["要点1", "要点2", "要点3"],
      "slide_type": "title",
      "description": "此页说明"
    }}
  ],
  "metadata": {{
    "scenario": "{project.scenario}",
    "total_slides": {page_count}
  }}
}}
```

### 📚【文档内容】：
{content}

请只输出JSON，不要其他内容。"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            response = await self.llm_service._call_chat_api(messages)
            outline = self._parse_outline_response(response, project.topic, page_count)
            
            # 保存到项目
            project.outline = outline
            project.status = "outline_generated"
            project.updated_at = datetime.now()
            
            logger.info(f"[PPT] 大纲生成完成: {project_id}, {len(outline['slides'])} 页")
            return outline
            
        except Exception as e:
            logger.error(f"[PPT] 大纲生成失败: {e}")
            raise
    
    def _parse_outline_response(self, response: str, default_title: str, expected_pages: int) -> Dict[str, Any]:
        """解析 AI 返回的大纲"""
        try:
            # 尝试提取 JSON
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_match = re.search(r'\{[\s\S]*"slides"[\s\S]*\}', response)
                if json_match:
                    json_str = json_match.group()
                else:
                    raise ValueError("无法解析大纲")
            
            # 清理 JSON
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            
            outline = json.loads(json_str)
            
            # 确保必要字段
            if "title" not in outline:
                outline["title"] = default_title
            if "slides" not in outline:
                outline["slides"] = []
            if "metadata" not in outline:
                outline["metadata"] = {}
            
            outline["metadata"]["total_slides"] = len(outline["slides"])
            
            return outline
            
        except Exception as e:
            logger.warning(f"JSON 解析失败，使用默认大纲: {e}")
            return self._create_default_outline(default_title, expected_pages)
    
    def _create_default_outline(self, title: str, page_count: int) -> Dict[str, Any]:
        """创建默认大纲"""
        slides = [
            {"page_number": 1, "title": title, "content_points": ["专业演示"], "slide_type": "title"},
            {"page_number": 2, "title": "目录", "content_points": ["概述", "核心内容", "总结"], "slide_type": "agenda"}
        ]
        
        for i in range(3, page_count):
            slides.append({
                "page_number": i,
                "title": f"第{i-1}章",
                "content_points": ["要点1", "要点2", "要点3"],
                "slide_type": "content"
            })
        
        slides.append({
            "page_number": page_count,
            "title": "谢谢",
            "content_points": ["感谢聆听"],
            "slide_type": "conclusion"
        })
        
        return {
            "title": title,
            "slides": slides,
            "metadata": {"total_slides": page_count}
        }
    
    async def update_outline(self, project_id: str, outline: Dict[str, Any]) -> Dict[str, Any]:
        """更新大纲（用户编辑后）"""
        project = self.get_project(project_id)
        if not project:
            raise ValueError("项目不存在")
        
        project.outline = outline
        project.updated_at = datetime.now()
        
        logger.info(f"[PPT] 大纲已更新: {project_id}")
        return outline
    
    async def generate_slide_content(self, project_id: str, slide_index: int) -> str:
        """为单个幻灯片生成详细内容"""
        project = self.get_project(project_id)
        if not project or not project.outline:
            raise ValueError("项目或大纲不存在")
        
        if slide_index >= len(project.outline["slides"]):
            raise ValueError("幻灯片索引超出范围")
        
        slide = project.outline["slides"][slide_index]
        
        prompt = f"""请为以下PPT页面生成详细内容：

主题：{project.topic}
页面标题：{slide['title']}
当前要点：{', '.join(slide.get('content_points', []))}

请生成3-5个详细的要点，每个要点20-40字，内容专业、有深度。
只输出要点列表，每行一个要点，以 • 开头。"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            response = await self.llm_service._call_chat_api(messages)
            
            # 解析要点
            points = []
            for line in response.strip().split('\n'):
                line = line.strip()
                if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                    points.append(line.lstrip('•-* '))
                elif line:
                    points.append(line)
            
            # 更新大纲中的要点
            project.outline["slides"][slide_index]["content_points"] = points[:5]
            project.updated_at = datetime.now()
            
            return points
            
        except Exception as e:
            logger.error(f"[PPT] 内容生成失败: {e}")
            raise
    
    async def generate_all_slides(self, project_id: str) -> List[Dict[str, Any]]:
        """并行生成所有幻灯片的详细内容"""
        project = self.get_project(project_id)
        if not project or not project.outline:
            raise ValueError("项目或大纲不存在")
        
        slides = project.outline["slides"]
        
        # 并行生成内容（跳过封面和结尾页）
        tasks = []
        for i, slide in enumerate(slides):
            if slide.get("slide_type") not in ["title", "conclusion"]:
                tasks.append(self.generate_slide_content(project_id, i))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        project.status = "slides_generated"
        project.updated_at = datetime.now()
        
        return project.outline["slides"]
    
    def generate_slides_html(self, project_id: str) -> str:
        """生成完整的 HTML 幻灯片"""
        project = self.get_project(project_id)
        if not project or not project.outline:
            raise ValueError("项目或大纲不存在")
        
        config = self.SCENARIO_CONFIGS.get(project.scenario, self.SCENARIO_CONFIGS["general"])
        slides = project.outline["slides"]
        
        # 生成每页的 HTML
        slides_html = []
        for i, slide in enumerate(slides):
            slide_html = self._generate_slide_html(slide, i, len(slides), config)
            slides_html.append(slide_html)
        
        # 组装完整 HTML
        full_html = self._generate_full_html(
            project.outline["title"],
            slides_html,
            config,
            len(slides)
        )
        
        return full_html
    
    def _generate_slide_html(self, slide: Dict[str, Any], index: int, total: int, config: Dict[str, Any]) -> str:
        """生成单页幻灯片 HTML"""
        slide_type = slide.get("slide_type", "content")
        title = slide.get("title", "")
        points = slide.get("content_points", [])
        
        if slide_type == "title":
            return f'''
            <div class="slide title-slide" id="slide-{index + 1}">
                <h1>{title}</h1>
                <h3>{points[0] if points else ''}</h3>
            </div>
            '''
        
        elif slide_type == "agenda":
            items_html = ''.join([f'<li>{p}</li>' for p in points])
            return f'''
            <div class="slide agenda-slide" id="slide-{index + 1}">
                <h2>{title}</h2>
                <ul>{items_html}</ul>
            </div>
            '''
        
        elif slide_type == "conclusion":
            return f'''
            <div class="slide thankyou-slide" id="slide-{index + 1}">
                <h1>{title}</h1>
                <h3>感谢聆听</h3>
            </div>
            '''
        
        else:  # content
            points_html = ''.join([f'<li>• {p}</li>' for p in points])
            return f'''
            <div class="slide content-slide" id="slide-{index + 1}">
                <h2>{title}</h2>
                <ul class="content-list">{points_html}</ul>
                <div class="page-number">{index + 1} / {total}</div>
            </div>
            '''
    
    def _generate_full_html(self, title: str, slides_html: List[str], config: Dict[str, Any], total: int) -> str:
        """生成完整的 HTML 文档"""
        color = config["color_scheme"]
        font = config["font_family"]
        
        return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: {font};
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .presentation-container {{
            width: 1280px;
            height: 720px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            position: relative;
        }}
        .slides-wrapper {{
            width: 100%;
            height: calc(100% - 60px);
            position: relative;
            overflow: hidden;
        }}
        .slide {{
            display: none;
            width: 100%;
            height: 100%;
            padding: 60px 80px;
            position: absolute;
            top: 0;
            left: 0;
        }}
        .slide.active {{ display: flex; flex-direction: column; }}
        
        .title-slide, .thankyou-slide {{
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, {color}22, {color}11);
        }}
        .title-slide h1, .thankyou-slide h1 {{
            font-size: 3.5em;
            color: {color};
            margin-bottom: 20px;
        }}
        .title-slide h3, .thankyou-slide h3 {{
            font-size: 1.5em;
            color: #666;
            font-style: italic;
        }}
        
        .agenda-slide h2, .content-slide h2 {{
            font-size: 2.2em;
            color: {color};
            border-bottom: 3px solid {color};
            padding-bottom: 15px;
            margin-bottom: 30px;
        }}
        .agenda-slide ul {{
            list-style: none;
            padding: 0;
        }}
        .agenda-slide li {{
            padding: 15px 0;
            font-size: 1.4em;
            color: #555;
            border-bottom: 1px solid #eee;
        }}
        
        .content-list {{
            list-style: none;
            padding: 0;
            flex: 1;
        }}
        .content-list li {{
            padding: 12px 0;
            font-size: 1.3em;
            color: #333;
            border-bottom: 1px solid #f0f0f0;
        }}
        .page-number {{
            text-align: right;
            color: #999;
            font-size: 0.9em;
            margin-top: auto;
        }}
        
        .navigation {{
            background: {color};
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
        }}
        .navigation button {{
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1em;
            transition: background 0.3s;
        }}
        .navigation button:hover {{ background: rgba(255,255,255,0.3); }}
        #slideCounter {{ font-weight: bold; }}
    </style>
</head>
<body>
    <div class="presentation-container">
        <div class="slides-wrapper">
            {''.join(slides_html)}
        </div>
        <div class="navigation">
            <button onclick="changeSlide(-1)">‹ 上一页</button>
            <span id="slideCounter">1 / {total}</span>
            <button onclick="changeSlide(1)">下一页 ›</button>
        </div>
    </div>
    <script>
        let currentSlide = 0;
        const totalSlides = {total};
        const slides = document.querySelectorAll('.slide');
        
        function showSlide(n) {{
            if (n >= totalSlides) currentSlide = 0;
            if (n < 0) currentSlide = totalSlides - 1;
            slides.forEach(s => s.classList.remove('active'));
            slides[currentSlide].classList.add('active');
            document.getElementById('slideCounter').textContent = (currentSlide + 1) + ' / ' + totalSlides;
        }}
        
        function changeSlide(n) {{
            currentSlide += n;
            showSlide(currentSlide);
        }}
        
        document.addEventListener('keydown', e => {{
            if (e.key === 'ArrowLeft') changeSlide(-1);
            if (e.key === 'ArrowRight' || e.key === ' ') {{ e.preventDefault(); changeSlide(1); }}
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        }});
        
        function toggleFullscreen() {{
            if (!document.fullscreenElement) {{
                document.querySelector('.presentation-container').requestFullscreen();
            }} else {{
                document.exitFullscreen();
            }}
        }}
        
        showSlide(0);
    </script>
</body>
</html>'''


# 全局实例
ppt_service = None

def get_ppt_service(llm_service):
    global ppt_service
    if ppt_service is None:
        ppt_service = PPTService(llm_service)
    return ppt_service
