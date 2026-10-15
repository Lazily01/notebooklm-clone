import os
import asyncio
import httpx
import base64
import tempfile
from pathlib import Path
from dotenv import load_dotenv
import dashscope
from dashscope.audio.qwen_tts import SpeechSynthesizer
from .prompt_manager import prompt_manager
from .token_tracker import token_tracker

load_dotenv()


class LLMService:
    """阿里云通义千问服务"""
    
    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_API_KEY")
        # 混合模型策略
        self.long_context_model = os.getenv("QWEN_LONG_MODEL", "qwen-long")      # 长文档处理
        self.creative_model = os.getenv("QWEN_CREATIVE_MODEL", "qwen3-plus")     # 创意生成
        # 向下兼容
        self.vision_model = os.getenv("QWEN_MODEL", "qwen-long")
        self.text_model = os.getenv("QWEN_TEXT_MODEL", "qwen-long")
        self.base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
        
        print(f"[LLM] 模型配置: 长文档={self.long_context_model}, 创意={self.creative_model}")
    
    async def _call_chat_api(self, messages: list, use_vision: bool = False, stream: bool = False, model_type: str = "long"):
        """
        调用通义千问 API
        
        Args:
            messages: 消息列表
            use_vision: 是否使用视觉模型
            stream: 是否流式输出
            model_type: 模型类型 ("long" 长文档 / "creative" 创意生成)
        
        Returns:
            如果 stream=False: 返回 {"content": str, "usage": dict}
            如果 stream=True: 返回异步生成器
        """
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 根据场景选择模型
        if use_vision:
            model = self.vision_model
        elif model_type == "creative":
            model = self.creative_model
        else:
            model = self.long_context_model
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 8000,
            "stream": stream
        }
        
        # 流式输出
        if stream:
            return self._stream_chat(url, headers, payload, model)
        
        # 非流式输出（原有逻辑）
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=120.0, verify=True) as client:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code != 200:
                        raise Exception(f"API 错误: {response.status_code} - {response.text}")
                    
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    
                    # 打印 token 使用量
                    input_tokens = usage.get("prompt_tokens", 0)
                    output_tokens = usage.get("completion_tokens", 0)
                    total_tokens = usage.get("total_tokens", 0)
                    print(f"[Token] 模型: {model} | 输入: {input_tokens} | 输出: {output_tokens} | 总计: {total_tokens}")
                    
                    return {
                        "content": content,
                        "usage": usage
                    }
            except httpx.ConnectError as e:
                last_error = e
                print(f"连接失败，第 {attempt + 1} 次重试...")
                await asyncio.sleep(2)
            except Exception as e:
                raise e
        
        raise Exception(f"连接失败，已重试 {max_retries} 次: {last_error}")
    
    async def _stream_chat(self, url: str, headers: dict, payload: dict, model: str):
        """流式输出生成器"""
        import json
        
        async with httpx.AsyncClient(timeout=120.0, verify=True) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    raise Exception(f"API 错误: {response.status_code}")
                
                full_content = ""
                input_tokens = 0
                output_tokens = 0
                
                async for line in response.aiter_lines():
                    if not line or line == "data: [DONE]":
                        continue
                    
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            
                            # 提取内容
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                
                                if content:
                                    full_content += content
                                    yield content
                            
                            # 提取 token 使用量（最后一个chunk）
                            if "usage" in data and data["usage"]:
                                usage = data["usage"]
                                input_tokens = usage.get("prompt_tokens", 0)
                                output_tokens = usage.get("completion_tokens", 0)
                        
                        except json.JSONDecodeError:
                            continue
                
                # 流式结束，追踪 Token
                if input_tokens > 0 or output_tokens > 0:
                    print(f"[Token] 流式输出 - 模型: {model} | 输入: {input_tokens} | 输出: {output_tokens}")
                    # 这里可以添加 token_tracker.track_llm() 调用
    
    async def upload_file_and_get_id(self, file_content: bytes, filename: str) -> str:
        """上传文件到 Qwen-Long 并获取 file-id"""
        import httpx
        
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/files"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # 创建 multipart form data
        files = {
            'file': (filename, file_content, 'application/pdf'),
            'purpose': (None, 'file-extract')
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, files=files)
            if response.status_code == 200:
                result = response.json()
                return result.get("id")
            else:
                raise Exception(f"文件上传失败: {response.status_code} - {response.text}")
    
    async def extract_text_from_file(self, file_id: str) -> str:
        """使用 Qwen-Long 从 file-id 提取文本内容"""
        print(f"[Extract] 开始提取文本，file-id: {file_id}")
        
        messages = [
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            {'role': 'system', 'content': f'fileid://{file_id}'},
            {'role': 'user', 'content': '请提取这个文档中的所有文字内容，保持原有格式和结构。如果是表格，请保持表格结构。直接输出文字内容，不要添加任何解释或总结。'}
        ]
        
        try:
            print(f"[Extract] 调用 Qwen-Long API（可能需要较长时间）...")
            
            # 直接调用 API，使用更长的超时时间（5分钟）
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.text_model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 8000
            }
            
            async with httpx.AsyncClient(timeout=300.0) as client:  # 5分钟超时
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    raise Exception(f"API 错误: {response.status_code} - {response.text}")
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[Extract] 提取完成，文本长度: {len(content)}")
                return content
                
        except Exception as e:
            print(f"[Extract] 文本提取失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"文本提取失败: {str(e)}")
    
    async def ocr_images(self, images: list) -> str:
        """使用 Qwen-Long 通过文件上传方式识别图片中的文字（便宜）"""
        if not images:
            return ""
        
        results = []
        for img_info in images:
            page_num = img_info.get("page", "?")
            img_base64 = img_info.get("base64", "")
            
            try:
                # 将 base64 转换为字节
                import base64
                img_bytes = base64.b64decode(img_base64)
                
                # 上传图片获取 file-id
                print(f"[OCR] 第 {page_num} 页：上传图片...")
                file_id = await self.upload_file_and_get_id(img_bytes, f"page_{page_num}.png")
                print(f"[OCR] 第 {page_num} 页：获取 file-id: {file_id}")
                
                # 使用 file-id 调用 Qwen-Long
                messages = [
                    {'role': 'system', 'content': 'You are a helpful assistant.'},
                    {'role': 'system', 'content': f'fileid://{file_id}'},
                    {'role': 'user', 'content': '请识别并提取这张图片中的所有文字内容，保持原有格式和结构。如果是表格，请保持表格结构。'}
                ]
                
                result = await self._call_chat_api(messages, use_vision=False)
                text = result["content"]
                results.append(f"\n[第 {page_num} 页]\n{text}")
                print(f"[OCR] 第 {page_num} 页识别完成 (Qwen-Long)")
            except Exception as e:
                print(f"[OCR] 第 {page_num} 页识别失败: {e}")
                results.append(f"\n[第 {page_num} 页 - OCR 失败]")
        
        return "\n".join(results)
    
    async def recognize_image(self, img_base64: str, img_type: str = "jpeg") -> str:
        """使用 Qwen-Long 识别图片内容（比 VL-Max 便宜 16 倍）"""
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请详细描述这张图片的内容，如果图片中有文字，请完整提取出来。"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/{img_type};base64,{img_base64}"
                        }
                    }
                ]
            }
        ]
        
        try:
            # 使用 text_model (qwen-long)，不是 vision_model
            result = await self._call_chat_api(messages, use_vision=False)
            text = result["content"]
            print(f"[Image] Qwen-Long 识别成功，内容长度: {len(text)}")
            return text
        except Exception as e:
            print(f"[Image] 识别失败: {e}")
            return f"图片识别失败: {str(e)}"
    
    async def chat_with_files(self, question: str, file_ids: list, fallback_context: str = "") -> dict:
        """使用 qwen-long file_id 进行问答"""
        messages = [
            {
                "role": "system",
                "content": """你是一个专业的文档分析助手。你的任务是基于用户提供的文档内容来回答问题。

规则：
1. 只基于提供的文档内容回答，不要使用外部知识
2. 如果文档中没有相关信息，明确告知用户
3. 【重要】多文档引用格式 - 必须严格遵守：
   - 当回答涉及多个文档时，必须使用【文档名】来标记不同文档的内容
   - 在【文档名】标记后，使用 [页码] 格式引用该文档的页面
   - PDF/Word/文本文档：使用 [页码] 格式，如 [1] 表示第1页，[15] 表示第15页
   - 音频文档：使用时间戳格式 (MM:SS)，如 (00:20) 表示20秒处，(05:30) 表示5分30秒处
   - 多文档正确示例：
     【建筑学基础.pdf】
     建筑设计的基本原则包括功能性[1]、美观性[2]和经济性[3]。
     
     【建筑史.pdf】
     中国古代建筑以木结构为主[5]，注重天人合一的理念[7]。
   - 单文档示例：
     "新功能将于2024年2月19日上线[1]，需要提前报备[3]。"
   - 每个关键信息后都应该添加引用标记
4. 保持回答准确、简洁、有条理
5. 【重要】在回答后，生成3个相关的联想问题，用于引导用户深入探索文档内容
   - 联想问题应该基于当前回答内容，帮助用户进一步了解相关主题
   - 使用特殊标记：在回答末尾添加 [SUGGESTIONS] 后跟3个问题，每个问题一行
   - 格式示例：
     回答内容...
     
     [SUGGESTIONS]
     问题1？
     问题2？
     问题3？"""
            }
        ]
        
        # 添加 file_id 引用
        for file_id in file_ids:
            messages.append({
                "role": "system",
                "content": f"fileid://{file_id}"
            })
        
        # 如果有备用上下文（没有 file_id 的文档），也添加进去
        if fallback_context:
            messages.append({
                "role": "system",
                "content": f"以下是额外的文档内容：\n{fallback_context}"
            })
        
        # 添加用户问题
        messages.append({
            "role": "user",
            "content": f"{question}\n\n请基于文档内容回答问题，并使用 [页码] 格式添加引用。"
        })

        try:
            api_result = await self._call_chat_api(messages)
            response = api_result["content"]
            
            # 解析回答和联想问题
            if "[SUGGESTIONS]" in response:
                parts = response.split("[SUGGESTIONS]")
                answer = parts[0].strip()
                suggestions_text = parts[1].strip()
                suggestions = [q.strip() for q in suggestions_text.split('\n') if q.strip()]
            else:
                answer = response
                suggestions = []
            
            return {
                "response": answer,
                "suggestions": suggestions,
                "usage": api_result.get("usage", {})
            }
        except Exception as e:
            raise Exception(f"LLM 调用失败: {str(e)}")
    
    async def chat(self, question: str, context: str) -> dict:
        """基于文档内容回答问题，返回回答和联想问题"""
        messages = [
            {
                "role": "system",
                "content": """你是一个专业的文档分析助手。你的任务是基于用户提供的文档内容来回答问题。

规则：
1. 只基于提供的文档内容回答，不要使用外部知识
2. 如果文档中没有相关信息，明确告知用户
3. 【重要】多文档引用格式 - 必须严格遵守：
   - 当回答涉及多个文档时，必须使用【文档名】来标记不同文档的内容
   - 在【文档名】标记后，使用 [页码] 格式引用该文档的页面
   - PDF/Word/文本文档：使用 [页码] 格式，如 [1] 表示第1页，[15] 表示第15页
   - 音频文档：使用时间戳格式 (MM:SS)，如 (00:20) 表示20秒处，(05:30) 表示5分30秒处
   - 上下文中已经标注了每个片段的文档名和页码，请使用对应的标记
   - 多文档正确示例：
     【建筑学基础.pdf】
     建筑设计的基本原则包括功能性[1]、美观性[2]和经济性[3]。
     
     【建筑史.pdf】
     中国古代建筑以木结构为主[5]，注重天人合一的理念[7]。
   - 单文档示例：
     "新功能将于2024年2月19日上线[1]，需要提前报备[3]。"
   - 每个关键信息后都应该添加引用标记
4. 保持回答准确、简洁、有条理
5. 【重要】在回答后，生成3个相关的联想问题，用于引导用户深入探索文档内容
   - 联想问题应该基于当前回答内容，帮助用户进一步了解相关主题
   - 使用特殊标记：在回答末尾添加 [SUGGESTIONS] 后跟3个问题，每个问题一行
   - 格式示例：
     回答内容...
     
     [SUGGESTIONS]
     问题1？
     问题2？
     问题3？"""
            },
            {
                "role": "user",
                "content": f"以下是文档内容：\n{context}\n\n---\n\n用户问题：{question}\n\n请基于以上文档内容回答问题。对于文本文档使用 [页码] 格式，对于音频文档使用 (MM:SS) 时间戳格式添加引用。"
            }
        ]

        try:
            api_result = await self._call_chat_api(messages)
            response = api_result["content"]
            
            # 解析回答和联想问题
            if "[SUGGESTIONS]" in response:
                parts = response.split("[SUGGESTIONS]")
                answer = parts[0].strip()
                suggestions_text = parts[1].strip()
                suggestions = [q.strip() for q in suggestions_text.split('\n') if q.strip()]
            else:
                answer = response
                suggestions = []
            
            return {
                "response": answer,
                "suggestions": suggestions,
                "usage": api_result.get("usage", {})
            }
        except Exception as e:
            raise Exception(f"LLM 调用失败: {str(e)}")
    
    async def _get_rag_content(self, doc_id: str, queries: list, max_chunks: int = 8) -> str:
        """
        使用 RAG 检索获取文档内容（通用方法）
        
        Args:
            doc_id: 文档ID
            queries: 检索查询列表
            max_chunks: 最多返回的片段数
        
        Returns:
            合并的文档内容
        """
        try:
            from .rag_service import rag_service
            
            all_chunks = []
            for query in queries:
                result = await rag_service.search(
                    query=query,
                    top_k=3,
                    filter_doc_ids=[doc_id]
                )
                if result and result.get("chunks"):
                    all_chunks.extend(result["chunks"])
            
            # 去重
            seen_chunks = set()
            unique_chunks = []
            for chunk in all_chunks:
                chunk_id = chunk.get("chunk_id")
                if chunk_id not in seen_chunks:
                    seen_chunks.add(chunk_id)
                    unique_chunks.append(chunk)
            
            # 合并内容
            if unique_chunks:
                content = "\n\n".join([chunk.get('text', '') for chunk in unique_chunks[:max_chunks]])
                print(f"[LLM] RAG 检索到 {len(unique_chunks)} 个片段，使用前 {min(len(unique_chunks), max_chunks)} 个")
                return content
            else:
                return ""
        
        except Exception as e:
            print(f"[LLM] RAG 检索失败: {e}")
            return ""
    
    async def summarize(self, content: str, doc_type: str = "text", doc_id: str = None, use_rag: bool = True) -> str:
        """
        生成文档摘要（优先使用 RAG 检索）
        
        Args:
            content: 文档内容
            doc_type: 文档类型
            doc_id: 文档ID（用于 RAG 检索）
            use_rag: 是否使用 RAG（默认 True）
        
        Returns:
            摘要文本
        """
        content_length = len(content)
        print(f"[LLM] 摘要生成 - 文档长度: {content_length} 字符")
        
        # 策略1：使用 RAG 检索生成摘要（推荐，适合所有长度）
        if use_rag and doc_id:
            try:
                print(f"[LLM] 使用 RAG 检索生成摘要")
                # 延迟导入，避免循环依赖
                from .rag_service import rag_service
                
                # 使用多个问题检索关键内容
                queries = [
                    "这个文档的主要内容和核心观点是什么？",
                    "文档的结构和章节安排是怎样的？",
                    "文档中的关键信息和重要结论有哪些？"
                ]
                
                all_chunks = []
                for query in queries:
                    result = await rag_service.search(
                        query=query,
                        top_k=3,  # 每个问题检索 3 个片段
                        filter_doc_ids=[doc_id]
                    )
                    if result and result.get("chunks"):
                        all_chunks.extend(result["chunks"])
                
                # 去重（基于 chunk_id）
                seen_chunks = set()
                unique_chunks = []
                for chunk in all_chunks:
                    chunk_id = chunk.get("chunk_id")
                    if chunk_id not in seen_chunks:
                        seen_chunks.add(chunk_id)
                        unique_chunks.append(chunk)
                
                print(f"[LLM] RAG 检索到 {len(unique_chunks)} 个关键片段")
                
                if unique_chunks:
                    # 基于检索到的片段生成摘要
                    context = "\n\n".join([f"片段 {i+1}：\n{chunk.get('text', '')}" 
                                          for i, chunk in enumerate(unique_chunks[:8])])  # 最多使用 8 个片段
                    
                    prompt = f"""请基于以下文档的关键片段，生成一个完整、连贯的文档摘要（300-500字）：

{context}

要求：
1. 整合所有片段的核心信息
2. 突出文档的主题、结构和关键观点
3. 保持逻辑连贯，形成完整叙述
4. 使用简洁、专业的语言
5. 不要添加文档外的内容

请直接输出摘要："""
                    
                    messages = [{"role": "user", "content": prompt}]
                    result = await self._call_chat_api(messages)
                    return result["content"]
                else:
                    print(f"[LLM] RAG 未检索到片段，降级为传统摘要")
            
            except Exception as e:
                print(f"[LLM] RAG 摘要失败，降级为传统摘要: {e}")
                import traceback
                traceback.print_exc()
                # 降级为传统摘要
        
        # 策略2：传统摘要（降级方案）
        # 短文档（< 10000 字符）- 直接摘要
        if content_length <= 10000:
            prompt = prompt_manager.get_summary_prompt(doc_type, content, max_length=500)
            messages = [{"role": "user", "content": prompt}]
            try:
                result = await self._call_chat_api(messages)
                return result["content"]
            except Exception as e:
                raise Exception(f"摘要生成失败: {str(e)}")
        
        # 中等文档（10000-50000 字符）- 截取前 10000 字符
        elif content_length <= 50000:
            print(f"[LLM] 文档较长，截取前 10000 字符生成摘要")
            truncated_content = content[:10000]
            prompt = prompt_manager.get_summary_prompt(doc_type, truncated_content, max_length=500)
            messages = [{"role": "user", "content": prompt}]
            try:
                result = await self._call_chat_api(messages)
                summary = result["content"]
                return f"⚠️ 文档较长（{content_length} 字符），此摘要基于前 10000 字符生成。\n\n{summary}"
            except Exception as e:
                raise Exception(f"摘要生成失败: {str(e)}")
        
        # 超长文档（> 50000 字符）- 使用分层摘要
        else:
            print(f"[LLM] 文档超长（{content_length} 字符），使用分层摘要")
            from .hierarchical_summarizer import create_hierarchical_summarizer
            hierarchical_summarizer = create_hierarchical_summarizer(self)
            summary = await hierarchical_summarizer.summarize_long_document(content, max_length=500)
            return summary
    
    async def generate_outline(self, content: str, doc_id: str = None, use_rag: bool = True) -> str:
        """
        生成文档大纲（优先使用 RAG）
        
        Args:
            content: 文档内容
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档的结构和章节安排是怎样的？",
                    "文档包含哪些主要部分和小节？",
                    "文档的目录和大纲是什么？"
                ],
                max_chunks=10
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成大纲")
        
        # 如果内容过长，截断
        if len(content) > 10000:
            content = content[:10000]
            print(f"[LLM] 内容过长，截取前 10000 字符")
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档分析助手。"},
            {"role": "user", "content": f"请为以下文档生成大纲（使用层级结构）：\n\n{content}"}
        ]
        try:
            result = await self._call_chat_api(messages)
            return result["content"]  # 只返回文本内容
        except Exception as e:
            raise Exception(f"大纲生成失败: {str(e)}")
    
    async def generate_flashcards(self, content: str, doc_id: str = None, use_rag: bool = True) -> list:
        """
        生成闪卡问答对（优先使用 RAG）
        
        Args:
            content: 文档内容
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档中的关键概念和定义有哪些？",
                    "文档中的重要知识点是什么？",
                    "文档中需要记忆的核心内容有哪些？"
                ],
                max_chunks=10
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成闪卡")
        
        # 截断内容
        content = content[:8000]
        
        prompt = f"""请根据以下文档内容，生成10-15张闪卡用于学习和复习。

要求：
1. 每张闪卡包含一个问题(question)和一个答案(answer)
2. 问题应该是关键概念、定义、流程等重要知识点
3. 答案应该简洁明了，便于记忆
4. 问题和答案都使用中文
5. 返回JSON数组格式

返回格式示例：
[
  {{"question": "什么是XXX？", "answer": "XXX是指..."}},
  {{"question": "XXX的主要功能是什么？", "answer": "主要功能包括..."}}
]

文档内容：
{content}

请直接返回JSON数组，不要包含其他内容："""

        try:
            print(f"开始生成闪卡，文档长度: {len(content)}")
            messages = [{"role": "user", "content": prompt}]
            api_result = await self._call_chat_api(messages)
            result = api_result["content"]  # 提取 content 字段
            print(f"LLM 返回结果: {result[:500]}...")
            # 尝试解析JSON
            import json
            # 移除可能的markdown代码块标记
            if result.startswith("```"):
                result = result.split("\n", 1)[1]
                if result.endswith("```"):
                    result = result[:-3]
                result = result.strip()
            if result.startswith("json"):
                result = result[4:].strip()
            flashcards = json.loads(result)
            print(f"解析成功，生成 {len(flashcards)} 张闪卡")
            return flashcards
        except Exception as e:
            print(f"生成闪卡失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"生成闪卡失败: {str(e)}")

    async def generate_quiz(self, content: str, doc_id: str = None, use_rag: bool = True) -> list:
        """
        生成测验题目（优先使用 RAG）
        
        Args:
            content: 文档内容
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档中的关键知识点有哪些？",
                    "文档中的重要概念和定义是什么？",
                    "文档中需要掌握的核心内容有哪些？"
                ],
                max_chunks=10
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成测验")
        
        # 截断内容
        content = content[:8000]
        
        prompt = f"""请根据以下文档内容，生成5-8道单选题用于测验。

要求：
1. 每道题包含：question(问题)、options(4个选项A/B/C/D)、answer(正确答案字母)、explanation(答案解释)、hint(提示)
2. 问题应该考察文档中的关键知识点
3. 选项要有一定迷惑性，但正确答案必须明确
4. 解释要说明为什么这个答案是正确的
5. hint提示要给出一些线索帮助用户找到正确答案，但不能直接说出答案
6. 全部使用中文
7. 返回JSON数组格式

返回格式示例：
[
  {{
    "question": "根据文档，XXX的主要功能是什么？",
    "options": {{
      "A": "选项A内容",
      "B": "选项B内容", 
      "C": "选项C内容",
      "D": "选项D内容"
    }},
    "answer": "A",
    "explanation": "根据文档说明，XXX的主要功能是...",
    "hint": "提示：注意文档中关于XXX功能的特别说明。"
  }}
]

文档内容：
{content}

请直接返回JSON数组，不要包含其他内容："""

        try:
            print(f"开始生成测验，文档长度: {len(content)}")
            messages = [{"role": "user", "content": prompt}]
            api_result = await self._call_chat_api(messages)
            result = api_result["content"]  # 提取 content 字段
            print(f"LLM 返回结果: {result[:500]}...")
            import json
            # 移除可能的markdown代码块标记
            if result.startswith("```"):
                result = result.split("\n", 1)[1]
                if result.endswith("```"):
                    result = result[:-3]
                result = result.strip()
            if result.startswith("json"):
                result = result[4:].strip()
            quiz = json.loads(result)
            print(f"解析成功，生成 {len(quiz)} 道题目")
            return quiz
        except Exception as e:
            print(f"生成测验失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"生成测验失败: {str(e)}")

    async def generate_video_outline(self, content: str, section_count: int = 5, style: str = "documentary") -> list:
        """生成视频概述大纲（用于高质量 PPT + 演讲稿）
        
        Args:
            content: 文档内容
            section_count: 章节数量，5（简短）或 8（默认）
            style: 视频风格 - cartoon/documentary/narrative/short
        """
        # 为了控制 token，截断到前 20k 字符
        snippet = content[:20000]
        
        # 根据风格定制 prompt
        style_prompts = {
            "cartoon": {
                "name": "动画卡通风格",
                "narration_style": "活泼可爱、轻松幽默，像在给小朋友讲故事，多用比喻和拟人",
                "image_style": "3D卡通风格，可爱圆润建模，明亮的色彩，高饱和度，扁平插画风格"
            },
            "documentary": {
                "name": "纪录片风格", 
                "narration_style": "专业严谨、客观理性，像BBC纪录片旁白，有深度有权威感",
                "image_style": "纪录片摄影风格，真实感，冷色调，电影感，浅景深"
            },
            "narrative": {
                "name": "叙事风格",
                "narration_style": "娓娓道来、有故事感，像在讲一个引人入胜的故事，有起承转合",
                "image_style": "电影感，暖色调，故事氛围，光影斑驳，情绪化"
            },
            "short": {
                "name": "短视频风格",
                "narration_style": "快节奏、抓眼球，开门见山，多用金句和反问，像抖音爆款文案",
                "image_style": "高对比，强视觉冲击，霓虹灯，潮流风格，高饱和度"
            }
        }
        
        style_config = style_prompts.get(style, style_prompts["documentary"])

        prompt = f"""你现在是一个专业的{style_config["name"]}视频脚本策划师。

目标：
基于下面的文档内容，设计一份「{style_config["name"]}」视频概述大纲。

风格要求：
- 讲解稿风格：{style_config["narration_style"]}
- 配图风格：{style_config["image_style"]}

结构要求：
1. 将内容拆分为 {section_count} 个章节（section），不多不少。
2. 每个章节都要有：
   - section_index: 章节序号，从 1 开始。
   - title: 精炼的小标题，12 字以内。
   - summary: 1-2 句话概括这一节的主要内容。
   - key_points: 列表，包含 2-4 条要点。
   - narration: 讲解稿，{style_config["narration_style"]}，时长约 20-40 秒。
   - image_prompt: 豆包Seedream配图提示词，要求：
     * 用简洁连贯的自然语言描述画面（不要堆砌关键词）
     * 必须包含：画面主体 + 具体行为/状态 + 场景环境
     * 补充美学元素：风格（{style_config["image_style"]}）、色彩、光影、构图
     * 示例格式："一个穿着华丽服装的女孩，撑着遮阳伞走在林荫道上，莫奈油画风格，温暖的阳光透过树叶洒下斑驳光影"
   - suggested_duration_sec: 建议时长（秒），20-60 之间。
3. 请严格返回 JSON 数组格式，不要包含任何多余说明或 Markdown 代码块。

文档内容（可能被截断）：
{snippet}

请直接返回 JSON："""

        try:
            import json
            print(f"开始生成视频概述大纲，文档长度: {len(content)}")
            messages = [{"role": "user", "content": prompt}]
            api_result = await self._call_chat_api(messages)
            result = api_result["content"]
            print(f"[VideoOutline] LLM 返回结果前 500 字: {result[:500]}...")

            # 处理可能的 ```json 包裹
            result_str = result.strip()
            if result_str.startswith("```"):
                result_str = result_str.split("\n", 1)[1]
                if result_str.endswith("```"):
                    result_str = result_str[:-3]
                result_str = result_str.strip()
            if result_str.lower().startswith("json"):
                result_str = result_str[4:].strip()

            outline = json.loads(result_str)
            print(f"[VideoOutline] 解析成功，章节数: {len(outline)}")
            return outline
        except Exception as e:
            print(f"生成视频概述大纲失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"生成视频概述大纲失败: {str(e)}")

    def text_to_speech(self, text: str, output_path: str, voice: str = "Cherry") -> str:
        """使用 qwen-tts 将文本转为语音
        
        Args:
            text: 要转换的文本
            output_path: 输出音频文件路径
            voice: 音色，可选 Cherry(女声)、Ethan(男声) 等
        
        Returns:
            音频文件路径
        """
        try:
            print(f"[TTS] 开始合成，文本长度: {len(text)}, 音色: {voice}")
            
            import requests
            
            # 按官方示例：dashscope.audio.qwen_tts.SpeechSynthesizer.call
            response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
                model="qwen3-TTS-Flash-2025-11-27",
                api_key=self.api_key,
                text=text,
                voice=voice,
            )
            
            print(f"[TTS] 返回: {response}")
            
            # response 应该包含音频 URL
            if hasattr(response, 'output') and hasattr(response.output, 'audio'):
                audio_info = response.output.audio
                audio_url = audio_info.get('url') if isinstance(audio_info, dict) else getattr(audio_info, 'url', None)
                
                if audio_url:
                    print(f"[TTS] 音频URL: {audio_url}")
                    audio_response = requests.get(audio_url, timeout=30)
                    if audio_response.status_code == 200:
                        with open(output_path, 'wb') as f:
                            f.write(audio_response.content)
                        print(f"[TTS] 合成成功: {output_path}, 大小: {len(audio_response.content)} bytes")
                        return output_path
                    
            raise Exception(f"TTS 返回错误: {response}")
        except Exception as e:
            print(f"[TTS] 合成失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"语音合成失败: {str(e)}")

    async def generate_mindmap(self, content: str, doc_id: str = None, use_rag: bool = True) -> str:
        """
        生成思维导图（Markdown格式，优先使用 RAG）
        
        Args:
            content: 文档内容
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档的整体结构和主要内容是什么？",
                    "文档包含哪些关键主题和分支？",
                    "文档的核心观点和要点有哪些？"
                ],
                max_chunks=10
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成思维导图")
        
        # 如果内容过长，截断
        if len(content) > 8000:
            content = content[:8000]
            print(f"[LLM] 内容过长，截取前 8000 字符")
        
        messages = [
            {"role": "system", "content": """你是一个专业的思维导图生成助手。你需要将文档内容转换为Markdown格式的思维导图结构。

要求：
1. 使用Markdown标题层级（# ## ### ####）表示思维导图的层级
2. 第一级（#）是文档的核心主题
3. 第二级（##）是主要分支
4. 第三级（###）是子分支
5. 第四级（####）是更细的要点
6. 每个节点简洁明了，不超过15个字
7. 层级不要超过4级
8. 不要添加任何其他格式，只用标题层级"""},
            {"role": "user", "content": f"请将以下文档内容转换为思维导图的Markdown格式：\n\n{content}"}
        ]
        try:
            # 使用创意模型生成思维导图
            result = await self._call_chat_api(messages, model_type="creative")
            return result["content"]
        except Exception as e:
            raise Exception(f"思维导图生成失败: {str(e)}")

    async def generate_infographic(self, content: str, style: str = "商务简约", orientation: str = "landscape", detail_level: str = "standard", doc_id: str = None, use_rag: bool = True) -> dict:
        """生成信息图 - 直接让豆包4.5生成完整信息图
        
        Args:
            content: 文档内容
            style: 风格
            orientation: 比例 - landscape(横屏16:9), portrait(竖屏9:16), square(正方形1:1)
            detail_level: 详细程度 - concise(简洁), standard(标准), detailed(详细)
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
        """
        
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档的核心内容和关键数据是什么？",
                    "文档中的重要流程和步骤有哪些？",
                    "文档的主要观点和结论是什么？"
                ],
                max_chunks=8
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成信息图")
        
        # 如果内容过长，截断
        if len(content) > 6000:
            content = content[:6000]
            print(f"[LLM] 内容过长，截取前 6000 字符")
        
        # 根据详细程度调整提取要求
        detail_config = {
            "concise": {
                "points": 2,
                "steps": 3,
                "point_desc": "10-15字",
                "step_desc": "10-15字"
            },
            "standard": {
                "points": 3,
                "steps": 4,
                "point_desc": "15-25字",
                "step_desc": "15-20字"
            },
            "detailed": {
                "points": 4,
                "steps": 5,
                "point_desc": "25-40字",
                "step_desc": "20-30字"
            }
        }
        
        config = detail_config.get(detail_level, detail_config["standard"])
        
        # 第一步：用千问深度分析文档，提取详细准确的内容
        extract_prompt = f"""你是一位专业的信息图设计师。请仔细阅读以下文档，深入理解其核心内容，然后提取关键信息用于制作信息图。

【分析要求】
1. 首先理解文档的主题和目的
2. 识别文档中最重要的概念、流程或要点
3. 保留文档中的专业术语和关键数据
4. 确保提取的内容准确反映原文含义，不要编造

【提取格式】
标题："（概括文档主题，6-10字，要准确反映内容，用双引号包裹）"

{''.join([f'要点{i+1}："（标题3-5字）" - （具体说明，包含关键信息，{config["point_desc"]}）' + chr(10) for i in range(config['points'])])}
{''.join([f'步骤{i+1}："（步骤名3-5字）" - （详细操作说明，包含具体内容，{config["step_desc"]}）' + chr(10) for i in range(config['steps'])])}
总结："（核心价值或行动号召，15-20字，用双引号包裹）"

【重要提示】
- 要点和步骤的内容必须来自原文，不要泛泛而谈
- 如果文档有具体数据、时间、名称，请保留
- 如果文档是流程类，重点提取步骤；如果是概念类，重点提取要点
- 步骤数量根据实际内容决定（{config['steps']}个左右）

文档内容：
{content[:4000]}"""

        try:
            print(f"[信息图] 开始提取内容")
            messages = [{"role": "user", "content": extract_prompt}]
            api_result = await self._call_chat_api(messages)
            extracted = api_result["content"]
            print(f"[信息图] 内容提取完成")
            
            # 第二步：根据官方指南构建prompt，直接生成信息图
            style_desc = self._get_style_description(style)
            
            # 根据比例调整布局描述（4K分辨率）
            orientation_config = {
                "landscape": {
                    "ratio": "横版16:9比例",
                    "size": "3840x2160",  # 4K
                    "layout": "要点横向排列，步骤从左到右展示"
                },
                "portrait": {
                    "ratio": "竖版9:16比例",
                    "size": "2160x3840",  # 4K
                    "layout": "要点纵向排列，步骤从上到下展示"
                },
                "square": {
                    "ratio": "正方形1:1比例",
                    "size": "2160x2160",  # 4K
                    "layout": "要点环形或网格排列，步骤紧凑展示"
                }
            }
            
            orient_config = orientation_config.get(orientation, orientation_config["landscape"])
            
            prompt = f"""绘制一张专业精美的{style}风格信息图海报，内容如下：

{extracted}

【设计要求】
1. {orient_config['ratio']}，{style_desc}
2. 整体布局清晰，信息层次分明，视觉引导流畅
3. {orient_config['layout']}

【标题区域】
- 标题放在顶部中央，使用大号粗体字，醒目突出
- 标题下方可加副标题或简短说明

【要点展示区】
- {config['points']}个核心要点用精美卡片形式排列
- 每个卡片包含：醒目图标 + 要点标题 + 详细说明文字
- 卡片之间保持适当间距，视觉平衡
- 图标要与内容相关，风格统一

【流程步骤区】
- {config['steps']}个步骤用清晰的流程图展示
- 每个步骤包含：序号 + 步骤名称 + 操作说明 + 配套插画
- 步骤之间用箭头或连接线串联，体现先后顺序
- 插画要生动形象，帮助理解步骤内容

【总结区域】
- 总结放在底部横幅中，使用醒目的背景色
- 文字简洁有力，起到画龙点睛的作用

【文字要求】
- 所有中文文字必须清晰可读，字体大小适中
- 重要信息使用加粗或不同颜色突出
- 文字内容必须与提供的内容完全一致，不要修改或省略"""

            print(f"[信息图] 调用豆包4.5生成... 比例:{orientation} 详细程度:{detail_level}")
            image_url = await self._generate_full_infographic(prompt, orient_config['size'])
            
            if not image_url:
                raise Exception("图片生成失败")
            
            print(f"[信息图] 生成成功")
            return {
                "type": "image",
                "imageUrl": image_url,
                "style": style
            }
            
        except Exception as e:
            print(f"生成信息图失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"生成信息图失败: {str(e)}")
    
    def _get_style_description(self, style: str) -> str:
        """获取风格的详细描述"""
        style_map = {
            "商务简约": "现代商务风格，简洁专业，蓝色和灰色为主色调，扁平化设计，干净利落",
            "赛博朋克": "赛博朋克风格，深色背景，霓虹灯效果，粉色、紫色、青色发光，科幻未来感，像《赛博朋克2077》游戏风格",
            "可爱卡通": "可爱卡通风格，Q版人物和图标，圆润造型，马卡龙色系（粉、黄、蓝），萌系设计，像儿童绘本插画",
            "科技未来": "科技未来风格，深蓝色背景，全息投影效果，蓝紫渐变，金属质感，科幻电影感",
            "自然清新": "自然清新风格，浅绿色和米色为主，手绘植物元素，水彩质感，温馨舒适"
        }
        return style_map.get(style, f"{style}风格，请根据这个风格特点来设计")

    async def _generate_full_infographic(self, prompt: str, size: str = "2560x1440") -> str:
        """生成完整信息图（支持豆包、通义千问、智谱）
        
        Args:
            prompt: 生成提示词
            size: 图片尺寸 - 2560x1440(横屏), 1440x2560(竖屏), 1440x1440(正方形)
        """
        provider = os.getenv("IMAGE_PROVIDER", "ark").lower()
        
        if provider == "qwen":
            return await self._generate_image_qwen(prompt, size)
        elif provider == "glm":
            return await self._generate_image_glm(prompt, size)
        else:
            return await self._generate_image_ark(prompt, size)
    
    async def _generate_image_qwen(self, prompt: str, size: str = "2560x1440") -> str:
        """使用通义千问生成图片"""
        try:
            # 尺寸映射：豆包格式 -> 通义千问格式
            size_map = {
                # 标准尺寸
                "2560x1440": "1664*928",   # 16:9
                "1440x2560": "928*1664",   # 9:16
                "1440x1440": "1328*1328",  # 1:1
                "2048x2048": "1328*1328",  # 1:1
                # 4K尺寸（信息图）
                "3840x2160": "1664*928",   # 16:9 横屏
                "2160x3840": "928*1664",   # 9:16 竖屏
                "2160x2160": "1328*1328",  # 1:1 正方形
            }
            qwen_size = size_map.get(size, "1664*928")
            
            api_key = os.getenv("DASHSCOPE_API_KEY")
            model = os.getenv("QWEN_IMAGE_MODEL", "qwen-image-max")
            
            url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # 截断 prompt 避免太长
            short_prompt = prompt[:800] if len(prompt) > 800 else prompt
            
            payload = {
                "model": model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"text": short_prompt}
                            ]
                        }
                    ]
                },
                "parameters": {
                    "negative_prompt": "低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感。构图混乱。文字模糊，扭曲。",
                    "prompt_extend": True,
                    "watermark": False,
                    "size": qwen_size,
                    "n": 1
                }
            }
            
            print(f"[通义千问] 发送请求，模型: {model}, 尺寸: {qwen_size}, prompt长度: {len(short_prompt)}")
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                print(f"[通义千问] 响应状态码: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"[通义千问] 请求失败: {response.status_code} - {response.text[:500]}")
                    return None
                
                result = response.json()
                
                # 解析通义千问的响应格式
                choices = result.get("output", {}).get("choices", [])
                if choices and len(choices) > 0:
                    content = choices[0].get("message", {}).get("content", [])
                    if content and len(content) > 0:
                        image_url = content[0].get("image")
                        if image_url:
                            print(f"[通义千问] 生成成功")
                            return image_url
                
                print(f"[通义千问] 未获取到图片: {result}")
                return None
                    
        except Exception as e:
            print(f"[通义千问] 生成失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _generate_image_ark(self, prompt: str, size: str = "2560x1440") -> str:
        """使用豆包生成图片"""
        try:
            ark_base_url = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
            ark_api_key = os.getenv("ARK_API_KEY")
            
            url = f"{ark_base_url}/images/generations"
            
            headers = {
                "Authorization": f"Bearer {ark_api_key}",
                "Content-Type": "application/json"
            }
            
            # 截断 prompt 避免太长
            short_prompt = prompt[:1500] if len(prompt) > 1500 else prompt
            
            payload = {
                "model": os.getenv("ARK_IMAGE_MODEL", "ep-20251205202908-h9vmw"),
                "prompt": short_prompt,
                "size": size,
                "response_format": "url",
                "watermark": False
            }
            
            print(f"[豆包] 发送请求，prompt长度: {len(short_prompt)}")
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                print(f"[豆包] 响应状态码: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"[豆包] 请求失败: {response.status_code} - {response.text[:500]}")
                    return None
                
                result = response.json()
                data = result.get("data", [])
                
                if data and len(data) > 0:
                    return data[0].get("url")
                else:
                    print(f"[豆包] 未获取到图片: {result}")
                    return None
                    
        except Exception as e:
            print(f"[豆包] 生成失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _generate_image_glm(self, prompt: str, size: str = "2560x1440") -> str:
        """使用智谱 GLM-Image 生成图片"""
        try:
            # 尺寸映射：豆包格式 -> 智谱格式
            size_map = {
                # 标准尺寸
                "2560x1440": "1728x960",   # 16:9
                "1440x2560": "960x1728",   # 9:16
                "1440x1440": "1280x1280",  # 1:1
                "2048x2048": "1280x1280",  # 1:1
                # 4K尺寸（信息图）
                "3840x2160": "1728x960",   # 16:9 横屏
                "2160x3840": "960x1728",   # 9:16 竖屏
                "2160x2160": "1280x1280",  # 1:1 正方形
            }
            glm_size = size_map.get(size, "1728x960")
            
            api_key = os.getenv("GLM_API_KEY")
            model = os.getenv("GLM_IMAGE_MODEL", "glm-image")
            
            url = "https://open.bigmodel.cn/api/paas/v4/images/generations"
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # 截断 prompt 避免太长（智谱限制1000字符）
            short_prompt = prompt[:1000] if len(prompt) > 1000 else prompt
            
            payload = {
                "model": model,
                "prompt": short_prompt,
                "size": glm_size
            }
            
            print(f"[智谱GLM] 发送请求，模型: {model}, 尺寸: {glm_size}, prompt长度: {len(short_prompt)}")
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                print(f"[智谱GLM] 响应状态码: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"[智谱GLM] 请求失败: {response.status_code} - {response.text[:500]}")
                    return None
                
                result = response.json()
                
                # 解析智谱的响应格式
                data = result.get("data", [])
                if data and len(data) > 0:
                    image_url = data[0].get("url")
                    if image_url:
                        print(f"[智谱GLM] 生成成功")
                        return image_url
                
                print(f"[智谱GLM] 未获取到图片: {result}")
                return None
                    
        except Exception as e:
            print(f"[智谱GLM] 生成失败: {e}")
            import traceback
            traceback.print_exc()
            return None

    async def _generate_icon(self, keyword: str, style: str) -> str:
        """使用豆包 Seedream 4.0 生成图标"""
        
        # 根据风格构建 prompt
        style_prompts = {
            "商务简约": "商务简约风格，扁平化设计，蓝灰色调，简洁线条",
            "赛博朋克": "赛博朋克风格，霓虹灯效果，粉紫色和青色，未来科技感，发光效果",
            "可爱卡通": "可爱卡通风格，Q版，圆润造型，马卡龙色系，萌系设计",
            "科技未来": "科技未来风格，全息效果，蓝紫渐变，金属质感，科幻",
            "自然清新": "自然清新风格，绿色系，有机形状，环保主题"
        }
        
        style_desc = style_prompts.get(style, style)
        
        prompt = f"""设计一个代表 "{keyword}" 的精美图标。

【设计要求】
- 风格：{style_desc}
- 图标设计，简洁明了，易于识别
- 高质量，细节丰富
- 适合用于应用界面或信息图"""
        
        try:
            ark_base_url = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
            ark_api_key = os.getenv("ARK_API_KEY")
            
            url = f"{ark_base_url}/images/generations"
            
            headers = {
                "Authorization": f"Bearer {ark_api_key}",
                "Content-Type": "application/json"
            }
            
            # 截断 prompt 避免太长
            short_prompt = prompt[:1500] if len(prompt) > 1500 else prompt
            
            payload = {
                "model": os.getenv("ARK_IMAGE_MODEL", "ep-20251205202908-h9vmw"),
                "prompt": short_prompt,
                "size": "2048x2048",  # 4.5要求最小2K
                "response_format": "url",
                "watermark": False
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                print(f"[豆包] 生成图标: {keyword}")
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    print(f"[豆包] 请求失败: {response.status_code} - {response.text}")
                    return None
                
                result = response.json()
                data = result.get("data", [])
                
                if data and len(data) > 0:
                    image_url = data[0].get("url")
                    print(f"[豆包] 图标生成成功: {image_url[:50]}...")
                    return image_url
                else:
                    print(f"[豆包] 未获取到图片: {result}")
                    return None
                    
        except Exception as e:
            print(f"[豆包] 生成失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def generate_audio_script(self, content: str, format_type: str = "deep_dive", length: str = "default", focus: str = "", doc_id: str = None, use_rag: bool = True) -> list:
        """
        生成音频概述脚本（优先使用 RAG）
        
        Args:
            content: 文档内容
            format_type: 格式类型 (deep_dive/brief/critique/debate)
            length: 长度 (short/default)
            focus: 用户指定的关注点
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
            
        Returns:
            对话列表 [{"speaker": "A/B", "text": "..."}]
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档的核心主题和关键观点是什么？",
                    "文档中有哪些重要的论点和论据？",
                    "文档的结论和启示是什么？"
                ],
                max_chunks=10
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成音频脚本")
        
        # 如果内容过长，截断
        if len(content) > 8000:
            content = content[:8000]
            print(f"[LLM] 内容过长，截取前 8000 字符")
        
        format_prompts = {
            "deep_dive": """你是两位播客主持人，正在进行一场深入的对话讨论。
第一位主持人负责引导话题和提问。
第二位主持人是嘉宾专家，负责深入解读和分析。
请根据以下文档内容，生成一段自然、生动的对话，深入探讨文档的核心内容。
重要：两位主持人之间不要互相称呼对方的名字或代号，直接进行对话即可。""",
            
            "brief": """你是一位专业的播客主持人。
请根据以下文档内容，生成一段简洁明了的概述，帮助听众快速理解核心要点。
只需要一个人的独白，用A表示。""",
            
            "critique": """你是一位专业的评论员。
请根据以下文档内容，生成一段专业的评论和分析，提供建设性的反馈和见解。
只需要一个人的独白，用A表示。""",
            
            "debate": """你是两位辩论者，正在进行一场理性的辩论。
第一位持正方观点，第二位持反方观点。
请根据以下文档内容，生成一段精彩的辩论对话，展示不同的观点和视角。
重要：两位辩论者之间不要互相称呼对方的名字或代号，直接进行对话即可。"""
        }
        length_hint = "简短版本，控制在8-10轮对话" if length == "short" else "可以有25-35轮对话完整版本"
        focus_hint = f"\n特别关注：{focus}" if focus else ""
        
        prompt = f"""{format_prompts.get(format_type, format_prompts["deep_dive"])}

{length_hint}{focus_hint}

文档内容：
{content[:8000]}

请按以下JSON格式输出对话：
[
  {{"speaker": "A", "text": "对话内容..."}},
  {{"speaker": "B", "text": "回应内容..."}},
  ...
]

注意：
1. 对话要自然流畅，像真人对话
2. 使用口语化的表达
3. 适当加入语气词和过渡词
4. 只输出JSON数组，不要其他内容"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            # 使用创意模型生成播客脚本
            api_result = await self._call_chat_api(messages, model_type="creative")
            response = api_result["content"]
            
            # 解析JSON
            import json
            import re
            
            # 尝试提取JSON
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                dialogues = json.loads(json_match.group())
                return dialogues
            else:
                # 如果解析失败，返回简单格式
                return [{"speaker": "A", "text": response}]
                
        except Exception as e:
            print(f"生成音频脚本失败: {e}")
            raise

    async def generate_report(self, content: str, format_type: str = "blog", custom_description: str = "", doc_id: str = None, use_rag: bool = True) -> str:
        """
        生成报告（优先使用 RAG）
        
        Args:
            content: 文档内容
            format_type: 格式类型 (custom/study_guide/blog)
            custom_description: 自己创作时的描述
            doc_id: 文档ID（用于 RAG）
            use_rag: 是否使用 RAG
            
        Returns:
            报告内容 (Markdown格式)
        """
        # 尝试使用 RAG
        if use_rag and doc_id:
            rag_content = await self._get_rag_content(
                doc_id=doc_id,
                queries=[
                    "文档的核心内容和主要观点是什么？",
                    "文档中的关键数据和事实有哪些？",
                    "文档的结论和建议是什么？"
                ],
                max_chunks=12
            )
            if rag_content:
                content = rag_content
                print(f"[LLM] 使用 RAG 内容生成报告")
        
        # 如果内容过长，截断
        if len(content) > 10000:
            content = content[:10000]
            print(f"[LLM] 内容过长，截取前 10000 字符")
        
        format_prompts = {
            "custom": f"""你是一位专业的报告撰写专家。
请根据以下文档内容和用户的要求，生成一份专业的报告。

用户要求：{custom_description}

请确保报告：
1. 符合用户描述的结构、风格和语气
2. 内容详实，不少于1000字
3. 使用Markdown格式
4. 包含清晰的标题和章节结构""",
            
            "study_guide": """你是一位专业的教育内容创作者。
请根据以下文档内容，生成一份完整的学习指南。

学习指南应包含以下部分（按顺序）：

## 一、测验题目
生成15-20个问答题，只写题目，格式如下：
1. [问题1]
2. [问题2]
3. [问题3]
...

---

## 二、论述题
生成5-8个论述题，只写题目，格式如下：
1. [论述题1]
2. [论述题2]
...

---

## 三、测验答案
对应上面的测验题目，给出详细答案：
1. 答：[详细答案，需要完整解释]
2. 答：[详细答案，需要完整解释]
...

---

## 四、论述题参考答案
对应上面的论述题，给出参考答案要点：
1. [论述题1的答案要点和分析]
2. [论述题2的答案要点和分析]
...

请确保：
1. 测验题覆盖文档的所有关键知识点
2. 论述题具有深度，考察综合理解和应用能力
3. 答案详细完整，有助于学习理解
4. 总字数不少于2000字
5. 使用Markdown格式""",
            
            "blog": """你是一位专业的博客作者和内容创作者。
请根据以下文档内容，生成一篇引人入胜的博客文章。

博客文章应包含：
1. 一个吸引眼球的标题
2. 引言：用生动的方式引出主题，引起读者共鸣
3. 核心亮点：分成多个小节，每个小节有清晰的标题
   - 使用通俗易懂的语言解释复杂概念
   - 适当使用比喻和例子
   - 包含实用的操作步骤或建议
4. 特别提示或注意事项
5. 总结：概括要点，给出行动建议
6. 结尾：可以是一个问题或号召，鼓励读者互动

请确保：
1. 语言生动活泼，像在和朋友聊天
2. 内容不少于1000字
3. 使用Markdown格式
4. 适当使用emoji增加趣味性（但不要过多）"""
        }
        
        prompt = f"""{format_prompts.get(format_type, format_prompts["blog"])}

文档内容：
{content[:10000]}

请直接输出报告内容，使用Markdown格式。"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            # 使用创意模型生成报告
            api_result = await self._call_chat_api(messages, model_type="creative")
            response = api_result["content"]
            return response
                
        except Exception as e:
            print(f"生成报告失败: {e}")
            raise

    async def generate_slides(self, content: str, style: str = "business", slide_count: int = 10) -> list:
        """
        生成幻灯片内容
        
        Args:
            content: 文档内容
            style: 风格 (business/tech/academic/creative/minimal)
            slide_count: 幻灯片数量
            
        Returns:
            幻灯片列表 [{"title": "...", "points": ["...", "..."], "notes": "..."}]
        """
        style_hints = {
            "business": "商务专业风格，简洁有力，重点突出",
            "tech": "科技感风格，现代简约，数据驱动",
            "academic": "学术风格，严谨规范，逻辑清晰",
            "creative": "创意活泼风格，生动有趣，吸引眼球",
            "minimal": "极简风格，留白多，核心信息突出"
        }
        
        prompt = f"""你是一位专业的演示文稿设计师。
请根据以下文档内容，生成一份{slide_count}页左右的幻灯片大纲。

风格要求：{style_hints.get(style, style_hints["business"])}

请按以下JSON格式输出：
[
  {{
    "title": "幻灯片标题",
    "points": ["要点1", "要点2", "要点3"],
    "notes": "演讲备注（可选）"
  }},
  ...
]

要求：
1. 第一页是封面，包含主题标题
2. 第二页是目录/概述
3. 中间是核心内容，每页3-5个要点
4. 最后一页是总结/结语
5. 要点简洁有力，每个不超过20字
6. 只输出JSON数组，不要其他内容

文档内容：
{content[:8000]}"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            api_result = await self._call_chat_api(messages)
            response = api_result["content"]
            
            # 解析JSON
            import json
            import re
            
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                slides = json.loads(json_match.group())
                return slides
            else:
                return [{"title": "生成失败", "points": ["请重试"], "notes": ""}]
                
        except Exception as e:
            print(f"生成幻灯片失败: {e}")
            raise

    async def generate_video_script(self, content: str, duration: int = 60) -> list:
        """
        生成视频脚本（分段内容 + 配图描述）
        
        Args:
            content: 文档内容
            duration: 目标时长（秒）
            
        Returns:
            脚本列表 [{"text": "旁白文字", "image_prompt": "配图描述", "duration": 秒数}]
        """
        segment_count = max(3, duration // 15)  # 每段约15秒
        
        prompt = f"""你是一位专业的视频脚本编剧。
请根据以下文档内容，生成一个约{duration}秒的视频脚本。

要求：
1. 分成{segment_count}个段落
2. 每段包含旁白文字和配图描述
3. 旁白要口语化，适合朗读
4. 配图描述要具体，便于AI生成图片

请按以下JSON格式输出：
[
  {{
    "text": "这段的旁白文字，口语化表达...",
    "image_prompt": "配图描述：具体场景、风格、元素...",
    "duration": 15
  }},
  ...
]

只输出JSON数组，不要其他内容。

文档内容：
{content[:6000]}"""

        messages = [{"role": "user", "content": prompt}]
        
        try:
            api_result = await self._call_chat_api(messages)
            response = api_result["content"]
            
            import json
            import re
            
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                script = json.loads(json_match.group())
                return script
            else:
                return [{"text": "生成失败，请重试", "image_prompt": "简约背景", "duration": 10}]
                
        except Exception as e:
            print(f"生成视频脚本失败: {e}")
            raise

