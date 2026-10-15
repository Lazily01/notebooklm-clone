"""
Presentation AI 风格的 PPT 生成服务
参考 presentation-ai-main 项目的核心逻辑
支持：大纲生成、幻灯片生成、AI 图片生成
"""

import json
import re
import logging
import uuid
import os
import httpx
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


# ========== 图片搜索服务 ==========
class ImageService:
    """图片搜索服务 - 使用 Pexels 搜索配图"""
    
    def __init__(self):
        # Pexels API - 免费图片
        self.pexels_api_key = os.getenv("PEXELS_API_KEY", "STdWNIuoCj7V5ZL1gBqzEZ2ehkapk0Hpa8PKSCU5mvpPHOnmHWWOBa7D")
    
    async def search_pexels(self, query: str, orientation: str = "landscape") -> Optional[str]:
        """从 Pexels 搜索图片"""
        if not self.pexels_api_key:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.pexels.com/v1/search",
                    params={
                        "query": query,
                        "per_page": 1,
                        "orientation": orientation
                    },
                    headers={
                        "Authorization": self.pexels_api_key
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("photos"):
                        url = data["photos"][0]["src"].get("large2x") or data["photos"][0]["src"].get("large")
                        print(f"[ImageService] Pexels 搜索成功")
                        return url
                    
        except Exception as e:
            print(f"[ImageService] Pexels 失败: {e}")
        
        return None
    
    async def get_image(self, query: str, source: str = "pexels") -> Optional[str]:
        """获取图片 - 使用 Pexels 搜索"""
        print(f"[ImageService] 获取图片: query='{query[:50]}...'")
        return await self.search_pexels(query)


# 全局图片服务实例
image_service = ImageService()


# ========== 主题配置 ==========
THEMES = {
    "daktilo": {
        "name": "Daktilo",
        "description": "现代简洁",
        "colors": {
            "primary": "#3B82F6",
            "secondary": "#1F2937",
            "accent": "#60A5FA",
            "background": "#FFFFFF",
            "text": "#1F2937",
            "heading": "#111827",
            "muted": "#6B7280"
        },
        "fonts": {"heading": "Inter", "body": "Inter"}
    },
    "cornflower": {
        "name": "Cornflower",
        "description": "专业大气",
        "colors": {
            "primary": "#4F46E5",
            "secondary": "#312E81",
            "accent": "#818CF8",
            "background": "#F8FAFC",
            "text": "#334155",
            "heading": "#1E293B",
            "muted": "#64748B"
        },
        "fonts": {"heading": "Poppins", "body": "Source Sans Pro"}
    },
    "mystique": {
        "name": "Mystique",
        "description": "深邃神秘",
        "colors": {
            "primary": "#7C3AED",
            "secondary": "#5B21B6",
            "accent": "#8B5CF6",
            "background": "#18181B",
            "text": "#D4D4D8",
            "heading": "#FAFAFA",
            "muted": "#A1A1AA"
        },
        "fonts": {"heading": "Montserrat", "body": "Raleway"}
    },
    "sunset": {
        "name": "Sunset",
        "description": "温暖活力",
        "colors": {
            "primary": "#EA580C",
            "secondary": "#C2410C",
            "accent": "#FB923C",
            "background": "#FFFBEB",
            "text": "#292524",
            "heading": "#1C1917",
            "muted": "#78716C"
        },
        "fonts": {"heading": "DM Serif Display", "body": "DM Sans"}
    },
    "forest": {
        "name": "Forest",
        "description": "自然清新",
        "colors": {
            "primary": "#059669",
            "secondary": "#047857",
            "accent": "#34D399",
            "background": "#F0FDF4",
            "text": "#1F2937",
            "heading": "#064E3B",
            "muted": "#6B7280"
        },
        "fonts": {"heading": "Bitter", "body": "Source Sans Pro"}
    }
}


# ========== 大纲生成提示词 ==========
OUTLINE_TEMPLATE = """Given the following presentation topic and requirements, generate a structured outline with {numberOfCards} main topics in markdown format.
The outline should be in {language} language.

Current Date: {currentDate}
Topic: {prompt}

First, generate an appropriate title for the presentation, then create exactly {numberOfCards} main topics that would make for an engaging and well-structured presentation.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects of the main topic
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs) and format each point as "- point text"
6. Keep each bullet point brief - just one sentence per point
7. Include exactly 2-3 bullet points per topic (not more, not less)"""


# ========== 幻灯片生成提示词 ==========
SLIDES_TEMPLATE = """You are an expert presentation designer. Your task is to create an engaging presentation in XML format.

## CORE REQUIREMENTS
1. FORMAT: Use <SECTION> tags for each slide
2. CONTENT: DO NOT copy outline verbatim - expand with examples, data, and context
3. VARIETY: Each slide must use a DIFFERENT layout component
4. LANGUAGE: Use {LANGUAGE} for all content

## PRESENTATION DETAILS
- Title: {TITLE}
- Topic: {PROMPT}
- Current Date: {CURRENT_DATE}
- Outline: {OUTLINE_FORMATTED}
- Total Slides: {TOTAL_SLIDES}

## PRESENTATION STRUCTURE
```xml
<PRESENTATION>
<SECTION layout="left|right|vertical">
  <!-- Required: include ONE layout component per slide -->
</SECTION>
</PRESENTATION>
```

## AVAILABLE LAYOUTS (use these exact XML tags):

1. COLUMNS: For comparisons
```xml
<COLUMNS>
  <DIV><H3>First Concept</H3><P>Description</P></DIV>
  <DIV><H3>Second Concept</H3><P>Description</P></DIV>
</COLUMNS>
```

2. BULLETS: For key points
```xml
<BULLETS>
  <DIV><H3>Main Point 1</H3><P>Description</P></DIV>
  <DIV><H3>Main Point 2</H3><P>Description</P></DIV>
</BULLETS>
```

3. ICONS: For concepts with symbols
```xml
<ICONS>
  <DIV><ICON query="rocket" /><H3>Innovation</H3><P>Description</P></DIV>
  <DIV><ICON query="shield" /><H3>Security</H3><P>Description</P></DIV>
</ICONS>
```

4. CYCLE: For processes and workflows
```xml
<CYCLE>
  <DIV><H3>Research</H3><P>Initial exploration phase</P></DIV>
  <DIV><H3>Design</H3><P>Solution creation phase</P></DIV>
  <DIV><H3>Implement</H3><P>Execution phase</P></DIV>
</CYCLE>
```

5. ARROWS: For cause-effect or flows
```xml
<ARROWS>
  <DIV><H3>Challenge</H3><P>Current problem</P></DIV>
  <DIV><H3>Solution</H3><P>Our approach</P></DIV>
  <DIV><H3>Result</H3><P>Outcomes</P></DIV>
</ARROWS>
```

6. TIMELINE: For chronological progression
```xml
<TIMELINE>
  <DIV><H3>2022</H3><P>Research completed</P></DIV>
  <DIV><H3>2023</H3><P>Development phase</P></DIV>
  <DIV><H3>2024</H3><P>Market expansion</P></DIV>
</TIMELINE>
```

7. PYRAMID: For hierarchical importance
```xml
<PYRAMID>
  <DIV><H3>Vision</H3><P>Our goal</P></DIV>
  <DIV><H3>Strategy</H3><P>Key approaches</P></DIV>
  <DIV><H3>Tactics</H3><P>Implementation steps</P></DIV>
</PYRAMID>
```

8. STAIRCASE: For progressive advancement
```xml
<STAIRCASE>
  <DIV><H3>Basic</H3><P>Foundational capabilities</P></DIV>
  <DIV><H3>Advanced</H3><P>Enhanced features</P></DIV>
  <DIV><H3>Expert</H3><P>Premium capabilities</P></DIV>
</STAIRCASE>
```

9. BOXES: For simple information tiles
```xml
<BOXES>
  <DIV><H3>Speed</H3><P>Faster delivery cycles.</P></DIV>
  <DIV><H3>Quality</H3><P>Automated testing.</P></DIV>
  <DIV><H3>Security</H3><P>Best practices.</P></DIV>
</BOXES>
```

10. COMPARE: For side-by-side comparison
```xml
<COMPARE>
  <DIV><H3>Solution A</H3><LI>Feature 1</LI><LI>Feature 2</LI></DIV>
  <DIV><H3>Solution B</H3><LI>Feature 3</LI><LI>Feature 4</LI></DIV>
</COMPARE>
```

11. PROS-CONS: For trade-offs
```xml
<PROS-CONS>
  <PROS><H3>Pros</H3><LI>Advantage 1</LI><LI>Advantage 2</LI></PROS>
  <CONS><H3>Cons</H3><LI>Disadvantage 1</LI><LI>Disadvantage 2</LI></CONS>
</PROS-CONS>
```

12. TABLE: For tabular data
```xml
<TABLE>
  <TR><TH>Header 1</TH><TH>Header 2</TH></TR>
  <TR><TD>Data 1</TD><TD>Data 2</TD></TR>
</TABLE>
```

13. IMAGES: Add images to slides for visual appeal
```xml
<!-- Good image queries (detailed, specific, in English): -->
<IMG query="futuristic smart city with renewable energy infrastructure" />
<IMG query="diverse team of professionals collaborating in modern office" />
<IMG query="abstract technology background with circuit patterns" />
```

## CRITICAL RULES
1. Generate exactly {TOTAL_SLIDES} slides. NOT MORE NOT LESS!
2. NEVER repeat layouts in consecutive slides
3. DO NOT copy outline verbatim - expand and enhance
4. Use appropriate heading hierarchy (H1 for titles, H2/H3 for subtitles)
5. Vary the SECTION layout attribute (left/right/vertical) throughout
6. Use only the XML tags shown above. Do not invent new tags.
7. IMPORTANT: Include at least one <IMG query="..."/> tag in most slides for visual appeal. The query should be in English and descriptive (10+ words).

Now create a complete XML presentation with {TOTAL_SLIDES} slides that significantly expands on the outline.
"""


class PresentationProject:
    """演示文稿项目"""
    def __init__(self, project_id: str, topic: str, content: str, doc_id: str = None):
        self.project_id = project_id
        self.topic = topic
        self.content = content
        self.doc_id = doc_id  # 文档ID（用于 RAG）
        self.title = ""
        self.outline = []  # ["# Topic 1\n- point1\n- point2", ...]
        self.slides_xml = ""
        self.slides = []  # 解析后的幻灯片数据
        self.theme = "daktilo"
        self.language = "Chinese"
        self.image_source = "pexels"  # pexels 或 ai
        self.ai_style = ""  # AI 生成时的自定义风格
        self.status = "created"
        self.created_at = datetime.now()


class PresentationService:
    """演示文稿生成服务"""
    
    projects: Dict[str, PresentationProject] = {}
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
    
    async def create_project(self, topic: str, content: str, theme: str = "daktilo", image_source: str = "pexels", ai_style: str = "", doc_id: str = None) -> PresentationProject:
        """创建项目"""
        project_id = str(uuid.uuid4())[:8]
        project = PresentationProject(project_id, topic, content, doc_id)
        project.theme = theme
        project.image_source = image_source
        project.ai_style = ai_style
        self.projects[project_id] = project
        logger.info(f"[Presentation] 创建项目: {project_id}, 图片来源: {image_source}, AI风格: {ai_style}, doc_id: {doc_id}")
        return project
    
    def get_project(self, project_id: str) -> Optional[PresentationProject]:
        return self.projects.get(project_id)
    
    async def generate_outline(self, project_id: str, num_slides: int = 8, use_rag: bool = True) -> Dict[str, Any]:
        """生成大纲（优先使用 RAG）"""
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
                    max_chunks=10
                )
                if rag_content:
                    content = rag_content
                    logger.info(f"[Presentation] 使用 RAG 内容生成大纲")
            except Exception as e:
                logger.warning(f"[Presentation] RAG 检索失败，使用原始内容: {e}")
        
        # 如果内容过长，截断
        if len(content) > 6000:
            content = content[:6000]
            logger.info(f"[Presentation] 内容过长，截取前 6000 字符")
        
        prompt = OUTLINE_TEMPLATE.format(
            numberOfCards=num_slides,
            language=project.language,
            currentDate=datetime.now().strftime("%Y年%m月%d日"),
            prompt=f"{project.topic}\n\n参考内容：\n{content}"
        )
        
        messages = [{"role": "user", "content": prompt}]
        
        try:
            api_result = await self.llm_service._call_chat_api(messages)
            response = api_result["content"]  # 提取 content 字段
            
            # 解析标题
            title_match = re.search(r'<TITLE>(.*?)</TITLE>', response, re.DOTALL)
            if title_match:
                project.title = title_match.group(1).strip()
            else:
                project.title = project.topic
            
            # 解析大纲主题
            outline_items = []
            sections = re.split(r'\n#\s+', response)
            for section in sections[1:]:  # 跳过第一个空的
                lines = section.strip().split('\n')
                if lines:
                    topic_title = lines[0].strip()
                    points = [l.strip() for l in lines[1:] if l.strip().startswith('-')]
                    outline_items.append({
                        "title": topic_title,
                        "points": [p.lstrip('- ') for p in points]
                    })
            
            project.outline = outline_items
            project.status = "outline_generated"
            
            logger.info(f"[Presentation] 大纲生成完成: {len(outline_items)} 个主题")
            
            return {
                "title": project.title,
                "outline": outline_items
            }
            
        except Exception as e:
            logger.error(f"[Presentation] 大纲生成失败: {e}")
            raise
    
    async def generate_slides(self, project_id: str) -> List[Dict[str, Any]]:
        """生成幻灯片内容"""
        project = self.get_project(project_id)
        if not project or not project.outline:
            raise ValueError("项目或大纲不存在")
        
        # 格式化大纲
        outline_formatted = "\n\n".join([
            f"# {item['title']}\n" + "\n".join([f"- {p}" for p in item['points']])
            for item in project.outline
        ])
        
        prompt = SLIDES_TEMPLATE.format(
            TITLE=project.title,
            PROMPT=project.topic,
            CURRENT_DATE=datetime.now().strftime("%Y年%m月%d日"),
            OUTLINE_FORMATTED=outline_formatted,
            TOTAL_SLIDES=len(project.outline),
            LANGUAGE=project.language
        )
        
        messages = [{"role": "user", "content": prompt}]
        
        try:
            api_result = await self.llm_service._call_chat_api(messages)
            response = api_result["content"]  # 提取 content 字段
            project.slides_xml = response
            
            # 解析 XML 为幻灯片数据
            slides = self._parse_slides_xml(response, project.theme)
            
            # 获取图片（Pexels 配图或 AI 生成完整幻灯片）
            slides = await self._fetch_images_for_slides(slides, project.image_source, project.ai_style)
            
            project.slides = slides
            project.status = "slides_generated"
            
            logger.info(f"[Presentation] 幻灯片生成完成: {len(slides)} 页")
            
            return slides
            
        except Exception as e:
            logger.error(f"[Presentation] 幻灯片生成失败: {e}")
            raise
    
    async def _fetch_images_for_slides(self, slides: List[Dict[str, Any]], image_source: str, ai_style: str = "") -> List[Dict[str, Any]]:
        """为幻灯片获取图片"""
        total_slides = len(slides)
        
        if image_source == "ai" and ai_style:
            # AI 生成完整幻灯片图片
            print(f"[Presentation] 使用 AI 生成 {total_slides} 张幻灯片图片，风格: {ai_style}")
            for i, slide in enumerate(slides):
                print(f"[Presentation] AI 生成幻灯片 {i + 1}/{total_slides}...")
                try:
                    url = await self._generate_slide_image(slide, i + 1, total_slides, ai_style)
                    if url:
                        slide["slide_image_url"] = url  # 完整幻灯片图片
                        print(f"[Presentation] 幻灯片 {i + 1} AI 生成成功")
                    else:
                        print(f"[Presentation] 幻灯片 {i + 1} AI 生成失败")
                except Exception as e:
                    print(f"[Presentation] 幻灯片 {i + 1} AI 生成异常: {e}")
        else:
            # Pexels 搜索配图
            image_count = sum(1 for s in slides if s.get("image_query"))
            print(f"[Presentation] 正在获取 {image_count} 张配图（Pexels）...")
            
            for i, slide in enumerate(slides):
                if slide.get("image_query"):
                    print(f"[Presentation] 获取幻灯片 {i + 1} 配图...")
                    try:
                        url = await image_service.get_image(slide["image_query"], image_source)
                        if url:
                            slide["image_url"] = url
                            print(f"[Presentation] 幻灯片 {i + 1} 配图获取成功")
                        else:
                            print(f"[Presentation] 幻灯片 {i + 1} 配图获取失败")
                    except Exception as e:
                        print(f"[Presentation] 幻灯片 {i + 1} 配图获取异常: {e}")
                    
                    # 添加延迟避免速率限制
                    await asyncio.sleep(1)
        
        return slides
    
    async def _generate_slide_image(self, slide: Dict[str, Any], slide_num: int, total_slides: int, style: str) -> Optional[str]:
        """生成完整幻灯片图片（支持豆包和通义千问）"""
        title = slide.get("title", f"幻灯片 {slide_num}")
        elements = slide.get("elements", [])
        
        # 构建要点内容
        points = []
        for elem in elements:
            if elem.get("title"):
                points.append(elem["title"])
            if elem.get("content"):
                points.append(elem["content"])
        
        points_text = "\n".join([f"• {p}" for p in points[:5]])  # 最多5个要点
        
        # 构建 prompt
        prompt = f"""绘制一张专业的{style}风格幻灯片，16:9横版比例：

【幻灯片标题】
标题为 "{title}"

【内容要点】
{points_text}

【设计要求】
- 标题 "{title}" 放在顶部，使用大号醒目字体
- 要点内容清晰排列，易于阅读
- 配色协调，视觉效果专业
- 可以添加相关的图标或插图装饰
- 确保所有文字清晰可读
- 重要：除了上述标题和要点文字外，画面中不要出现任何其他文字、水印、页码或装饰性文字"""

        provider = os.getenv("IMAGE_PROVIDER", "ark").lower()
        
        try:
            if provider == "qwen":
                return await self._generate_slide_image_qwen(prompt)
            elif provider == "glm":
                return await self._generate_slide_image_glm(prompt)
            else:
                return await self._generate_slide_image_ark(prompt)
        except Exception as e:
            print(f"[Presentation] 生成幻灯片失败: {e}")
            return None
    
    async def _generate_slide_image_qwen(self, prompt: str) -> Optional[str]:
        """使用通义千问生成幻灯片图片"""
        try:
            api_key = os.getenv("DASHSCOPE_API_KEY")
            model = os.getenv("QWEN_IMAGE_MODEL", "qwen-image-max")
            
            url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"text": prompt[:800]}
                            ]
                        }
                    ]
                },
                "parameters": {
                    "negative_prompt": "低分辨率，低画质，文字模糊，扭曲，构图混乱",
                    "prompt_extend": True,
                    "watermark": False,
                    "size": "1664*928",  # 16:9
                    "n": 1
                }
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    choices = result.get("output", {}).get("choices", [])
                    if choices and len(choices) > 0:
                        content = choices[0].get("message", {}).get("content", [])
                        if content and len(content) > 0:
                            return content[0].get("image")
                else:
                    print(f"[Presentation] 通义千问 API 错误: {response.status_code} - {response.text[:200]}")
                    
        except Exception as e:
            print(f"[Presentation] 通义千问生成失败: {e}")
        
        return None
    
    async def _generate_slide_image_ark(self, prompt: str) -> Optional[str]:
        """使用豆包生成幻灯片图片"""
        try:
            ark_base_url = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
            ark_api_key = os.getenv("ARK_API_KEY")
            
            url = f"{ark_base_url}/images/generations"
            headers = {
                "Authorization": f"Bearer {ark_api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": os.getenv("ARK_IMAGE_MODEL", "ep-20251205202908-h9vmw"),
                "prompt": prompt[:1500],
                "size": "2560x1440",
                "response_format": "url",
                "watermark": False
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("data") and len(data["data"]) > 0:
                        return data["data"][0].get("url")
                else:
                    print(f"[Presentation] 豆包 API 错误: {response.status_code} - {response.text[:200]}")
                    
        except Exception as e:
            print(f"[Presentation] 豆包生成失败: {e}")
        
        return None
    
    async def _generate_slide_image_glm(self, prompt: str) -> Optional[str]:
        """使用智谱 GLM-Image 生成幻灯片图片"""
        try:
            api_key = os.getenv("GLM_API_KEY")
            model = os.getenv("GLM_IMAGE_MODEL", "glm-image")
            
            url = "https://open.bigmodel.cn/api/paas/v4/images/generations"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "prompt": prompt[:1000],  # 智谱限制1000字符
                "size": "1728x960"  # 16:9
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    data = result.get("data", [])
                    if data and len(data) > 0:
                        return data[0].get("url")
                else:
                    print(f"[Presentation] 智谱GLM API 错误: {response.status_code} - {response.text[:200]}")
                    
        except Exception as e:
            print(f"[Presentation] 智谱GLM生成失败: {e}")
        
        return None
    
    def _parse_slides_xml(self, xml_content: str, theme: str) -> List[Dict[str, Any]]:
        """解析 XML 为幻灯片数据"""
        slides = []
        
        # 提取所有 SECTION
        section_pattern = r'<SECTION[^>]*>(.*?)</SECTION>'
        sections = re.findall(section_pattern, xml_content, re.DOTALL)
        
        for i, section_content in enumerate(sections):
            slide = self._parse_section(section_content, i)
            slides.append(slide)
        
        return slides
    
    def _parse_section(self, content: str, index: int) -> Dict[str, Any]:
        """解析单个 SECTION"""
        slide = {
            "id": str(uuid.uuid4())[:8],
            "index": index,
            "elements": []
        }
        
        # 解析标题
        h1_match = re.search(r'<H1>(.*?)</H1>', content, re.DOTALL)
        h2_match = re.search(r'<H2>(.*?)</H2>', content, re.DOTALL)
        
        if h1_match:
            slide["title"] = h1_match.group(1).strip()
        elif h2_match:
            slide["title"] = h2_match.group(1).strip()
        else:
            slide["title"] = f"Slide {index + 1}"
        
        # 解析图片查询
        img_match = re.search(r'<IMG\s+query="([^"]*)"', content, re.IGNORECASE)
        if img_match:
            slide["image_query"] = img_match.group(1).strip()
        
        # 检测布局类型
        layout_types = [
            "COLUMNS", "BULLETS", "ICONS", "CYCLE", "ARROWS", 
            "TIMELINE", "PYRAMID", "STAIRCASE", "BOXES", 
            "COMPARE", "PROS-CONS", "TABLE"
        ]
        
        for layout in layout_types:
            pattern = rf'<{layout}>(.*?)</{layout}>'
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                slide["layout"] = layout.lower()
                slide["elements"] = self._parse_layout_content(layout, match.group(1))
                break
        
        # 如果没有特殊布局，解析普通内容
        if not slide.get("elements"):
            slide["layout"] = "default"
            slide["elements"] = self._parse_default_content(content)
        
        return slide
    
    def _parse_layout_content(self, layout: str, content: str) -> List[Dict[str, Any]]:
        """解析布局内容"""
        elements = []
        
        # 解析 DIV 元素
        div_pattern = r'<DIV>(.*?)</DIV>'
        divs = re.findall(div_pattern, content, re.DOTALL)
        
        for div_content in divs:
            element = {}
            
            # 解析标题
            h3_match = re.search(r'<H3>(.*?)</H3>', div_content, re.DOTALL)
            if h3_match:
                element["title"] = h3_match.group(1).strip()
            
            # 解析段落
            p_match = re.search(r'<P>(.*?)</P>', div_content, re.DOTALL)
            if p_match:
                element["content"] = p_match.group(1).strip()
            
            # 解析列表项
            li_items = re.findall(r'<LI>(.*?)</LI>', div_content, re.DOTALL)
            if li_items:
                element["items"] = [item.strip() for item in li_items]
            
            # 解析图标
            icon_match = re.search(r'<ICON\s+query="([^"]*)"', div_content)
            if icon_match:
                element["icon"] = icon_match.group(1)
            
            if element:
                elements.append(element)
        
        # 特殊处理 PROS-CONS
        if layout.upper() == "PROS-CONS":
            pros_match = re.search(r'<PROS>(.*?)</PROS>', content, re.DOTALL)
            cons_match = re.search(r'<CONS>(.*?)</CONS>', content, re.DOTALL)
            
            if pros_match:
                pros_items = re.findall(r'<LI>(.*?)</LI>', pros_match.group(1), re.DOTALL)
                elements.append({"type": "pros", "items": [i.strip() for i in pros_items]})
            
            if cons_match:
                cons_items = re.findall(r'<LI>(.*?)</LI>', cons_match.group(1), re.DOTALL)
                elements.append({"type": "cons", "items": [i.strip() for i in cons_items]})
        
        # 特殊处理 TABLE
        if layout.upper() == "TABLE":
            rows = re.findall(r'<TR>(.*?)</TR>', content, re.DOTALL)
            table_data = []
            for row in rows:
                cells = re.findall(r'<T[HD]>(.*?)</T[HD]>', row, re.DOTALL)
                table_data.append([cell.strip() for cell in cells])
            elements = [{"type": "table", "data": table_data}]
        
        return elements
    
    def _parse_default_content(self, content: str) -> List[Dict[str, Any]]:
        """解析默认内容"""
        elements = []
        
        # 解析段落
        paragraphs = re.findall(r'<P>(.*?)</P>', content, re.DOTALL)
        for p in paragraphs:
            elements.append({"type": "paragraph", "content": p.strip()})
        
        return elements
    
    def generate_html(self, project_id: str) -> str:
        """生成 HTML 预览"""
        project = self.get_project(project_id)
        if not project or not project.slides:
            raise ValueError("项目或幻灯片不存在")
        
        theme = THEMES.get(project.theme, THEMES["daktilo"])
        colors = theme["colors"]
        fonts = theme["fonts"]
        
        slides_html = []
        for i, slide in enumerate(project.slides):
            slide_html = self._render_slide_html(slide, i, len(project.slides), colors)
            slides_html.append(slide_html)
        
        return self._wrap_html(project.title, slides_html, colors, fonts, len(project.slides))
    
    def _render_slide_html(self, slide: Dict, index: int, total: int, colors: Dict) -> str:
        """渲染单个幻灯片 HTML"""
        
        # 如果有 AI 生成的完整幻灯片图片，直接显示图片
        if slide.get("slide_image_url"):
            active_class = "active" if index == 0 else ""
            return f'''
            <div class="slide ai-slide {active_class}">
                <img src="{slide["slide_image_url"]}" alt="幻灯片 {index + 1}" />
            </div>
            '''
        
        layout = slide.get("layout", "default")
        title = slide.get("title", "")
        elements = slide.get("elements", [])
        
        # 根据布局类型渲染
        content_html = ""
        
        if layout == "bullets":
            items_html = "".join([
                f'<div class="bullet-item"><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="bullets-container">{items_html}</div>'
        
        elif layout == "columns":
            cols_html = "".join([
                f'<div class="column"><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="columns-container">{cols_html}</div>'
        
        elif layout == "icons":
            icons_html = "".join([
                f'<div class="icon-item"><span class="icon">●</span><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="icons-container">{icons_html}</div>'
        
        elif layout == "timeline":
            items_html = "".join([
                f'<div class="timeline-item"><div class="timeline-dot"></div><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="timeline-container">{items_html}</div>'
        
        elif layout == "arrows":
            items_html = "".join([
                f'<div class="arrow-item"><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="arrows-container">{items_html}</div>'
        
        elif layout == "pyramid":
            items_html = "".join([
                f'<div class="pyramid-level" style="width: {100 - i*20}%"><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for i, e in enumerate(elements)
            ])
            content_html = f'<div class="pyramid-container">{items_html}</div>'
        
        elif layout == "boxes":
            boxes_html = "".join([
                f'<div class="box-item"><h4>{e.get("title", "")}</h4><p>{e.get("content", "")}</p></div>'
                for e in elements
            ])
            content_html = f'<div class="boxes-container">{boxes_html}</div>'
        
        elif layout == "compare":
            cols_html = "".join([
                f'<div class="compare-side"><h4>{e.get("title", "")}</h4><ul>{"".join([f"<li>{item}</li>" for item in e.get("items", [])])}</ul></div>'
                for e in elements
            ])
            content_html = f'<div class="compare-container">{cols_html}</div>'
        
        elif layout == "pros-cons":
            pros = next((e for e in elements if e.get("type") == "pros"), {})
            cons = next((e for e in elements if e.get("type") == "cons"), {})
            content_html = f'''
            <div class="pros-cons-container">
                <div class="pros-side">
                    <h4>✓ 优点</h4>
                    <ul>{"".join([f"<li>{item}</li>" for item in pros.get("items", [])])}</ul>
                </div>
                <div class="cons-side">
                    <h4>✗ 缺点</h4>
                    <ul>{"".join([f"<li>{item}</li>" for item in cons.get("items", [])])}</ul>
                </div>
            </div>
            '''
        
        elif layout == "table":
            table_data = elements[0].get("data", []) if elements else []
            rows_html = ""
            for i, row in enumerate(table_data):
                tag = "th" if i == 0 else "td"
                cells = "".join([f"<{tag}>{cell}</{tag}>" for cell in row])
                rows_html += f"<tr>{cells}</tr>"
            content_html = f'<table class="data-table">{rows_html}</table>'
        
        else:
            # 默认布局
            items_html = "".join([
                f'<p>{e.get("content", "")}</p>' for e in elements
            ])
            content_html = f'<div class="default-content">{items_html}</div>'
        
        # 添加图片
        image_html = ""
        if slide.get("image_url"):
            image_html = f'<div class="slide-image"><img src="{slide["image_url"]}" alt="{title}" /></div>'
        
        return f'''
        <div class="slide" id="slide-{index + 1}">
            <div class="slide-content-wrapper">
                <div class="slide-text">
                    <h2 class="slide-title">{title}</h2>
                    {content_html}
                </div>
                {image_html}
            </div>
            <div class="slide-number">{index + 1} / {total}</div>
        </div>
        '''
    
    def _wrap_html(self, title: str, slides_html: List[str], colors: Dict, fonts: Dict, total: int) -> str:
        """包装完整 HTML"""
        return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{
            width: 100%;
            height: 100%;
            overflow: hidden;
        }}
        body {{
            font-family: {fonts["body"]}, sans-serif;
            background: {colors["background"]};
        }}
        .presentation {{
            width: 100%;
            height: 100%;
            background: {colors["background"]};
            overflow: hidden;
            position: relative;
        }}
        .slides-container {{
            width: 100%;
            height: calc(100% - 60px);
            position: relative;
        }}
        .slide {{
            display: none;
            width: 100%;
            height: 100%;
            padding: 60px 80px;
            position: absolute;
            top: 0;
            left: 0;
            flex-direction: column;
        }}
        .slide.active {{ display: flex; }}
        .slide.ai-slide {{
            padding: 0 !important;
        }}
        .slide.ai-slide img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        
        /* 幻灯片内容包装器 - 支持图文布局 */
        .slide-content-wrapper {{
            display: flex;
            gap: 40px;
            flex: 1;
            align-items: flex-start;
        }}
        .slide-text {{
            flex: 1;
            min-width: 0;
        }}
        .slide-image {{
            width: 400px;
            flex-shrink: 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }}
        .slide-image img {{
            width: 100%;
            height: 100%;
            object-fit: cover;
            max-height: 450px;
        }}
        
        .slide-title {{
            font-family: {fonts["heading"]}, sans-serif;
            font-size: 2.2em;
            color: {colors["heading"]};
            margin-bottom: 30px;
            border-bottom: 3px solid {colors["primary"]};
            padding-bottom: 15px;
        }}
        .slide-number {{
            position: absolute;
            bottom: 20px;
            right: 30px;
            color: {colors["muted"]};
            font-size: 0.9em;
        }}
        
        /* 布局样式 */
        .bullets-container, .icons-container {{
            display: flex;
            flex-direction: column;
            gap: 20px;
            flex: 1;
        }}
        .bullet-item, .icon-item {{
            padding: 15px 20px;
            background: {colors["background"]};
            border-left: 4px solid {colors["primary"]};
            border-radius: 0 8px 8px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }}
        .bullet-item h4, .icon-item h4 {{
            color: {colors["heading"]};
            margin-bottom: 8px;
            font-size: 1.2em;
        }}
        .bullet-item p, .icon-item p {{
            color: {colors["text"]};
            line-height: 1.6;
        }}
        .icon-item .icon {{
            color: {colors["primary"]};
            margin-right: 10px;
        }}
        
        .columns-container {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            flex: 1;
        }}
        .column {{
            padding: 25px;
            background: linear-gradient(135deg, {colors["background"]}, {colors["background"]}ee);
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }}
        .column h4 {{
            color: {colors["primary"]};
            margin-bottom: 12px;
            font-size: 1.3em;
        }}
        .column p {{
            color: {colors["text"]};
            line-height: 1.7;
        }}
        
        .timeline-container {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex: 1;
            padding-top: 40px;
            position: relative;
        }}
        .timeline-container::before {{
            content: '';
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            height: 4px;
            background: {colors["primary"]};
        }}
        .timeline-item {{
            flex: 1;
            text-align: center;
            position: relative;
            padding: 0 15px;
        }}
        .timeline-dot {{
            width: 20px;
            height: 20px;
            background: {colors["primary"]};
            border-radius: 50%;
            margin: 0 auto 20px;
            position: relative;
            z-index: 1;
        }}
        .timeline-item h4 {{
            color: {colors["heading"]};
            margin-bottom: 10px;
        }}
        .timeline-item p {{
            color: {colors["text"]};
            font-size: 0.95em;
        }}
        
        .arrows-container {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            flex: 1;
        }}
        .arrow-item {{
            flex: 1;
            padding: 25px;
            background: {colors["background"]};
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            position: relative;
        }}
        .arrow-item:not(:last-child)::after {{
            content: '→';
            position: absolute;
            right: -25px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 2em;
            color: {colors["primary"]};
        }}
        .arrow-item h4 {{
            color: {colors["primary"]};
            margin-bottom: 10px;
        }}
        .arrow-item p {{
            color: {colors["text"]};
        }}
        
        .pyramid-container {{
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            flex: 1;
            justify-content: center;
        }}
        .pyramid-level {{
            padding: 20px;
            background: linear-gradient(135deg, {colors["primary"]}22, {colors["primary"]}11);
            border-radius: 8px;
            text-align: center;
        }}
        .pyramid-level h4 {{
            color: {colors["heading"]};
            margin-bottom: 5px;
        }}
        .pyramid-level p {{
            color: {colors["text"]};
            font-size: 0.9em;
        }}
        
        .boxes-container {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 25px;
            flex: 1;
        }}
        .box-item {{
            padding: 30px;
            background: {colors["background"]};
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-top: 4px solid {colors["primary"]};
        }}
        .box-item h4 {{
            color: {colors["heading"]};
            margin-bottom: 12px;
            font-size: 1.2em;
        }}
        .box-item p {{
            color: {colors["text"]};
        }}
        
        .compare-container, .pros-cons-container {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            flex: 1;
        }}
        .compare-side, .pros-side, .cons-side {{
            padding: 30px;
            border-radius: 12px;
        }}
        .compare-side {{
            background: {colors["background"]};
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }}
        .pros-side {{
            background: linear-gradient(135deg, #10b98122, #10b98111);
        }}
        .cons-side {{
            background: linear-gradient(135deg, #ef444422, #ef444411);
        }}
        .compare-side h4, .pros-side h4, .cons-side h4 {{
            color: {colors["heading"]};
            margin-bottom: 15px;
            font-size: 1.3em;
        }}
        .compare-side ul, .pros-side ul, .cons-side ul {{
            list-style: none;
            padding: 0;
        }}
        .compare-side li, .pros-side li, .cons-side li {{
            padding: 10px 0;
            border-bottom: 1px solid {colors["muted"]}33;
            color: {colors["text"]};
        }}
        
        .data-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        .data-table th, .data-table td {{
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid {colors["muted"]}33;
        }}
        .data-table th {{
            background: {colors["primary"]}11;
            color: {colors["heading"]};
            font-weight: 600;
        }}
        .data-table td {{
            color: {colors["text"]};
        }}
        
        /* 导航 */
        .navigation {{
            height: 50px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 30px;
        }}
        .navigation button {{
            background: #ffffff;
            border: 1px solid #cbd5e1;
            color: #475569;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 500;
            transition: all 0.2s;
        }}
        .navigation button:hover {{
            background: #f1f5f9;
            border-color: #94a3b8;
        }}
        .navigation span {{
            color: #64748b;
            font-weight: 500;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="presentation">
        <div class="slides-container">
            {''.join(slides_html)}
        </div>
        <div class="navigation">
            <button id="prevBtn" onclick="changeSlide(-1)">‹ 上一页</button>
            <span id="counter">1 / {total}</span>
            <button id="nextBtn" onclick="changeSlide(1)">下一页 ›</button>
        </div>
    </div>
    <script>
        let current = 0;
        const total = {total};
        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        function updateButtons() {{
            // 更新按钮文字
            if (current === 0) {{
                prevBtn.textContent = '‹ 上一页';
            }} else {{
                prevBtn.textContent = '‹ 上一页';
            }}
            
            if (current === total - 1) {{
                nextBtn.textContent = '回到首页 ↺';
            }} else {{
                nextBtn.textContent = '下一页 ›';
            }}
        }}
        
        function showSlide(n) {{
            if (n >= total) current = 0;
            if (n < 0) current = total - 1;
            slides.forEach(s => s.classList.remove('active'));
            slides[current].classList.add('active');
            document.getElementById('counter').textContent = (current + 1) + ' / ' + total;
            updateButtons();
        }}
        
        function changeSlide(n) {{
            current += n;
            showSlide(current);
        }}
        
        document.addEventListener('keydown', e => {{
            if (e.key === 'ArrowLeft') changeSlide(-1);
            if (e.key === 'ArrowRight' || e.key === ' ') {{ e.preventDefault(); changeSlide(1); }}
            if (e.key === 'f' || e.key === 'F') {{
                document.querySelector('.presentation').requestFullscreen();
            }}
        }});
        
        showSlide(0);
    </script>
</body>
</html>'''


# 全局实例
presentation_service = None

def get_presentation_service(llm_service):
    global presentation_service
    if presentation_service is None:
        presentation_service = PresentationService(llm_service)
    return presentation_service
