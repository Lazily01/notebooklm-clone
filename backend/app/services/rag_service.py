"""
RAG 服务 - 使用 DashVector + text-embedding-v4
企业级向量检索方案

优化：
1. LangChain 智能切分（支持重叠、多语言）- 减少碎片，节省向量数
2. 混合检索（向量 + 关键词）- 提升准确率
3. 查询缓存 - 节省向量化成本
4. Token 透明化追踪 - 成本可视化
"""
import os
import hashlib
from typing import List, Dict, Optional
from dashvector import Client, Doc
from openai import OpenAI
from .token_tracker import token_tracker
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter


class RAGService:
    """RAG 检索增强生成服务"""
    
    def __init__(self):
        """初始化 DashVector 和 OpenAI 客户端"""
        # DashVector API Key（独立）
        dashvector_api_key = os.getenv("DASHVECTOR_API_KEY")
        
        # Qwen API Key（用于向量化）
        qwen_api_key = os.getenv("DASHSCOPE_API_KEY")
        
        # 初始化 DashVector
        # endpoint 必须从环境变量获取（每个用户的 endpoint 不同）
        endpoint = os.getenv("DASHVECTOR_ENDPOINT")
        if not endpoint:
            raise Exception("DASHVECTOR_ENDPOINT 未配置！请在 .env 中设置")
        
        print(f"[RAG] DashVector 配置:")
        print(f"  - Endpoint: {endpoint}")
        print(f"  - API Key: {dashvector_api_key[:10]}..." if dashvector_api_key else "  - API Key: None")
        
        self.dashvector_client = Client(api_key=dashvector_api_key, endpoint=endpoint)
        
        # 初始化 OpenAI（用于向量化）
        # 注意：新版 OpenAI SDK 不支持 proxies 参数，如需代理请使用 http_client
        import httpx
        self.openai_client = OpenAI(
            api_key=qwen_api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            http_client=httpx.Client()  # 显式创建 client，避免代理参数冲突
        )
        
        # 集合名称（与 DashVector 控制台中的 Collection 名称一致）
        self.collection_name = "notebooklm"
        
        # 查询缓存（节省向量化成本）
        self.query_cache = {}  # {query_hash: vector}
        self.cache_max_size = 1000  # 最多缓存 1000 个查询
        
        # 初始化 LangChain 文本切分器
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,           # 最大片段大小
            chunk_overlap=100,        # 重叠字符数（解决跨片段信息丢失）
            length_function=len,      # 使用字符数计算长度
            separators=[
                "\n\n",   # 优先：段落分隔
                "\n",     # 其次：换行
                "。",     # 中文句号
                ". ",     # 英文句号
                "！",     # 中文感叹号
                "! ",     # 英文感叹号
                "？",     # 中文问号
                "? ",     # 英文问号
                "；",     # 中文分号
                "; ",     # 英文分号
                " ",      # 空格
                "",       # 字符
            ],
            keep_separator=True,      # 保留分隔符
        )
        print(f"[RAG] LangChain 切分器已初始化（chunk_size=800, overlap=100）")
        
        # 获取集合（假设已在 DashVector 控制台手动创建）
        try:
            collection_result = self.dashvector_client.get(self.collection_name)
            
            # 检查返回值是否是错误对象（DashVector SDK 特性）
            if isinstance(collection_result, dict) and "code" in collection_result:
                # 返回的是错误对象，不是集合
                print(f"[RAG] 集合不存在: {collection_result}")
                print(f"[RAG] 请在 DashVector 控制台创建名为 '{self.collection_name}' 的 Collection")
                print(f"[RAG] 配置：维度=1024, 距离度量=Cosine")
                self.collection = None
            else:
                # 成功获取集合
                self.collection = collection_result
                print(f"[RAG] 成功连接到集合: {self.collection_name}")
                
                # 获取集合状态
                try:
                    stats = self.collection.stats()
                    
                    # 检查 stats 是否也是错误对象
                    if isinstance(stats, dict) and "code" in stats:
                        print(f"[RAG] 集合状态异常: {stats}")
                        print(f"[RAG] Collection 可能未正确创建，请检查 DashVector 控制台")
                        self.collection = None
                    else:
                        print(f"[RAG] 集合状态: 向量数={stats.total_doc_count if hasattr(stats, 'total_doc_count') else 0}")
                except Exception as stats_error:
                    print(f"[RAG] 警告：无法获取集合状态: {stats_error}")
                    self.collection = None
        except Exception as e:
            print(f"[RAG] 连接集合失败: {e}")
            print(f"[RAG] 请确保在 DashVector 控制台已创建名为 '{self.collection_name}' 的 Collection")
            self.collection = None
    
    def split_text_smart(self, text: str, min_size: int = 200, max_size: int = 800, overlap: int = 100) -> List[str]:
        """
        使用 LangChain 智能切分文本（支持重叠、多语言）
        
        优势：
        1. 真正的重叠机制 - 解决跨片段信息丢失
        2. 多语言支持 - 中英文混合文档
        3. 递归切分策略 - 优先保持语义完整性
        4. 经过大规模验证 - 社区成熟方案
        
        Args:
            text: 原文本
            min_size: 最小片段大小（已废弃，保留兼容性）
            max_size: 最大片段大小（已废弃，使用 chunk_size=800）
            overlap: 重叠字符数（已废弃，使用固定 100）
        
        Returns:
            文本片段列表
        """
        if not text:
            return []
        
        # 使用 LangChain 切分
        chunks = self.text_splitter.split_text(text)
        
        # 过滤太短的片段（< 50字符）
        chunks = [c for c in chunks if len(c) >= 50]
        
        print(f"[RAG] LangChain 切分完成: {len(chunks)} 个片段（overlap=100, 语义完整）")
        return chunks
    
    def split_text(self, text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
        """
        文本切分（使用 LangChain）
        
        Args:
            text: 原文本
            chunk_size: 片段大小（已废弃，使用固定 800）
            overlap: 重叠大小（已废弃，使用固定 100）
        
        Returns:
            文本片段列表
        """
        return self.split_text_smart(text, max_size=chunk_size, overlap=overlap)
    
    def parse_pdf_with_pages(self, pdf_content: bytes = None, pdf_path: str = None) -> List[Dict]:
        """
        解析 PDF 文件，返回带真实页码的文本块
        
        Args:
            pdf_content: PDF 文件字节流（优先）
            pdf_path: PDF 文件路径（备选）
            
        Returns:
            [{"text": "...", "page": 1}, {"text": "...", "page": 2}, ...]
        """
        chunks_with_pages = []
        
        try:
            # 优先使用字节流，否则使用文件路径
            if pdf_content:
                doc = fitz.open(stream=pdf_content, filetype="pdf")
                print(f"[RAG] 解析 PDF（字节流）, 共 {len(doc)} 页")
            elif pdf_path:
                doc = fitz.open(pdf_path)
                print(f"[RAG] 解析 PDF: {pdf_path}, 共 {len(doc)} 页")
            else:
                raise ValueError("必须提供 pdf_content 或 pdf_path")
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                
                if not text.strip():
                    continue
                
                # 按段落切分（保持语义完整）
                paragraphs = text.split('\n\n')
                for para in paragraphs:
                    para = para.strip()
                    if len(para) >= 50:  # 过滤太短的段落
                        chunks_with_pages.append({
                            "text": para,
                            "page": page_num + 1  # 页码从 1 开始
                        })
            
            doc.close()
            print(f"[RAG] PDF 解析完成: {len(chunks_with_pages)} 个文本块（带真实页码）")
            
        except Exception as e:
            print(f"[RAG] PDF 解析失败: {e}")
            import traceback
            traceback.print_exc()
        
        return chunks_with_pages
    
    async def vectorize_text(self, text: str) -> List[float]:
        """
        向量化单个文本
        
        Args:
            text: 要向量化的文本
        
        Returns:
            向量（1024维）
        """
        response = self.openai_client.embeddings.create(
            model="text-embedding-v4",  # 1024 维
            input=text,
            extra_body={"text_type": "document"}  # 标记为文档文本
        )
        return response.data[0].embedding
    
    async def vectorize_batch(self, texts: List[str]) -> List[List[float]]:
        """
        批量向量化文本（更高效）
        
        Args:
            texts: 文本列表
        
        Returns:
            向量列表
        """
        # DashVector 批量限制为 10，分批处理
        batch_size = 10
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            response = self.openai_client.embeddings.create(
                model="text-embedding-v4",  # 1024 维
                input=batch,
                extra_body={"text_type": "document"}
            )
            embeddings = [data.embedding for data in response.data]
            all_embeddings.extend(embeddings)
            print(f"[RAG] 向量化进度: {min(i + batch_size, len(texts))}/{len(texts)}")
        
        return all_embeddings
    
    async def add_document_with_pages(self, doc_id: str, chunks_with_pages: List[Dict], metadata: Optional[Dict] = None) -> Dict:
        """
        添加带页码的文档到向量库（用于 PDF）
        
        Args:
            doc_id: 文档ID
            chunks_with_pages: 带页码的文本块列表 [{"text": "...", "page": 1}, ...]
            metadata: 元数据（如文档名、类型等）
            
        Returns:
            统计信息：chunks_count, tokens_used
        """
        # 检查集合是否可用
        if not self.collection:
            print(f"[RAG] 错误：集合不可用！")
            return {"chunks_count": 0, "tokens_used": 0}
        
        print(f"[RAG] 开始向量化文档 {doc_id}，共 {len(chunks_with_pages)} 个片段（带页码）")
        
        if not chunks_with_pages:
            print(f"[RAG] 文档 {doc_id} 无有效内容，跳过")
            return {"chunks_count": 0, "tokens_used": 0}
        
        # 1. 提取文本用于向量化
        texts = [chunk["text"] for chunk in chunks_with_pages]
        
        # 2. 批量向量化
        embeddings = await self.vectorize_batch(texts)
        
        # 3. 计算消耗的 tokens
        total_chars = sum(len(chunk["text"]) for chunk in chunks_with_pages)
        tokens_used = total_chars // 2
        
        # 4. 追踪 Token 使用
        token_tracker.track_vectorization("document", tokens_used)
        
        # 5. 准备数据（包含真实页码）
        docs = []
        for i, (chunk_data, embedding) in enumerate(zip(chunks_with_pages, embeddings)):
            doc_data = {
                "text": chunk_data["text"],
                "doc_id": doc_id,
                "chunk_id": i,
                "chunk_total": len(chunks_with_pages),
                "page": chunk_data.get("page", 1)  # 真实页码
            }
            
            # 合并用户提供的元数据
            if metadata:
                doc_data.update(metadata)
            
            docs.append(Doc(
                id=f"{doc_id}_chunk_{i}",
                vector=embedding,
                fields=doc_data
            ))
        
        # 6. 批量插入 DashVector
        try:
            result = self.collection.upsert(docs)
            
            if isinstance(result, dict) and "code" in result:
                if result.get("code") == 0:
                    print(f"[RAG] ✅ 文档 {doc_id} 已添加: {len(docs)} 个片段（带真实页码），消耗 {tokens_used} tokens")
                else:
                    print(f"[RAG] ❌ 文档 {doc_id} 添加失败: {result.get('message', 'Unknown error')}")
                    return {"chunks_count": 0, "tokens_used": 0}
            else:
                print(f"[RAG] ✅ 文档 {doc_id} 已添加: {len(docs)} 个片段（带真实页码），消耗 {tokens_used} tokens")
        except Exception as e:
            print(f"[RAG] ❌ 文档 {doc_id} 添加失败: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            "chunks_count": len(chunks_with_pages),
            "tokens_used": tokens_used
        }
    
    async def add_document(self, doc_id: str, text: str, metadata: Optional[Dict] = None, estimate_pages: bool = False) -> Dict:
        """
        添加文档到向量库
        
        Args:
            doc_id: 文档ID
            text: 文档文本
            metadata: 元数据（如文档名、类型等）
            estimate_pages: 是否估算页码（用于 OCR PDF）
            
        Returns:
            统计信息：chunks_count, tokens_used
        """
        # 检查集合是否可用
        if not self.collection:
            print(f"[RAG] 错误：集合不可用！self.collection = {self.collection}")
            print(f"[RAG] 跳过向量化")
            return {"chunks_count": 0, "tokens_used": 0}
        
        print(f"[RAG] 集合可用，开始向量化文档 {doc_id}")
        
        # 1. 切分文本
        chunks = self.split_text(text)
        
        if not chunks:
            print(f"[RAG] 文档 {doc_id} 无有效内容，跳过")
            return {"chunks_count": 0, "tokens_used": 0}
        
        # 2. 批量向量化
        embeddings = await self.vectorize_batch(chunks)
        
        # 3. 计算消耗的 tokens（粗略估算：每个字符 = 0.5 token）
        total_chars = sum(len(chunk) for chunk in chunks)
        tokens_used = total_chars // 2
        
        # 4. 追踪 Token 使用
        token_tracker.track_vectorization("document", tokens_used)
        
        # 4. 准备数据
        docs = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc_data = {
                "text": chunk,
                "doc_id": doc_id,
                "chunk_id": i,
                "chunk_total": len(chunks)
            }
            
            # 如果需要估算页码（OCR PDF）
            if estimate_pages:
                # 假设每 500 字符为一页（粗略估算）
                chars_per_page = 500
                total_chars = len(text)
                estimated_page = min(i * chars_per_page // chars_per_page + 1, 
                                    (total_chars // chars_per_page) + 1)
                doc_data["page"] = estimated_page
            
            # 合并用户提供的元数据
            if metadata:
                doc_data.update(metadata)
            
            docs.append(Doc(
                id=f"{doc_id}_chunk_{i}",
                vector=embedding,
                fields=doc_data
            ))
        
        # 5. 批量插入 DashVector
        try:
            result = self.collection.upsert(docs)
            
            # 检查返回结果是否是错误对象
            if isinstance(result, dict) and "code" in result:
                if result.get("code") == 0:
                    # 成功
                    print(f"[RAG] ✅ 文档 {doc_id} 已添加: {len(docs)} 个片段，消耗 {tokens_used} tokens")
                else:
                    # 失败
                    print(f"[RAG] ❌ 文档 {doc_id} 添加失败: {result.get('message', 'Unknown error')}")
                    return {"chunks_count": 0, "tokens_used": 0}
            else:
                print(f"[RAG] ✅ 文档 {doc_id} 已添加: {len(docs)} 个片段，消耗 {tokens_used} tokens")
        except Exception as e:
            print(f"[RAG] ❌ 文档 {doc_id} 添加失败: {e}")
            import traceback
            traceback.print_exc()
        
        return {
            "chunks_count": len(chunks),
            "tokens_used": tokens_used
        }
    
    def _keyword_score(self, query: str, text: str) -> float:
        """
        关键词匹配得分（混合检索）
        
        Args:
            query: 查询文本
            text: 文档文本
        
        Returns:
            匹配得分 (0-1)
        """
        # 简单的关键词匹配
        query_lower = query.lower()
        text_lower = text.lower()
        
        # 提取查询中的关键词（去除常见停用词）
        stop_words = {'的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'}
        keywords = [w for w in query_lower.split() if w not in stop_words and len(w) > 1]
        
        if not keywords:
            return 0.0
        
        # 计算匹配度
        matches = sum(1 for kw in keywords if kw in text_lower)
        score = matches / len(keywords)
        
        return score
    
    def _rerank_chunks(self, query: str, chunks: List[Dict]) -> List[Dict]:
        """
        重排序检索结果（混合向量分数和关键词分数）
        
        Args:
            query: 查询文本
            chunks: 检索结果
        
        Returns:
            重排序后的结果
        """
        for chunk in chunks:
            vector_score = chunk['score']
            keyword_score = self._keyword_score(query, chunk['text'])
            
            # 混合得分：70% 向量 + 30% 关键词
            chunk['final_score'] = vector_score * 0.7 + keyword_score * 0.3
            chunk['keyword_score'] = keyword_score
        
        # 按最终得分排序
        chunks.sort(key=lambda x: x['final_score'], reverse=True)
        
        return chunks
    
    async def search(self, query: str, top_k: int = 3, filter_doc_ids: Optional[List[str]] = None, use_rerank: bool = True) -> Dict:
        """
        智能检索相关文档片段（向量检索 + 关键词 + 重排序）
        
        优化：
        1. 向量检索（语义相似度）
        2. 关键词匹配（精确匹配）
        3. 混合重排序（70% 向量 + 30% 关键词）
        
        Args:
            query: 用户问题
            top_k: 返回前 K 个结果
            filter_doc_ids: 只在指定文档中检索（可选）
            use_rerank: 是否使用重排序
        
        Returns:
            {
                "chunks": 相关片段列表,
                "tokens_used": 向量化消耗的 tokens,
                "query_count": 查询次数
            }
        """
        # 检查集合是否可用
        if not self.collection:
            print(f"[RAG] 错误：集合不可用！self.collection = {self.collection}")
            print(f"[RAG] 跳过检索")
            return {
                "chunks": [],
                "tokens_used": 0,
                "query_count": 0
            }
        
        print(f"[RAG] 集合可用，开始检索: {query[:50]}...")
        
        # 1. 向量化查询（使用缓存）
        query_hash = hashlib.md5(query.encode()).hexdigest()
        
        if query_hash in self.query_cache:
            # 命中缓存
            query_vector = self.query_cache[query_hash]
            query_tokens = len(query) // 2  # 用于计算节省的成本
            
            # 追踪缓存命中
            token_tracker.track_vectorization("query", query_tokens, cached=True)
            query_tokens = 0  # 实际不消耗 tokens
            print(f"[RAG] 查询缓存命中，节省向量化成本")
        else:
            # 缓存未命中，调用 API
            response = self.openai_client.embeddings.create(
                model="text-embedding-v4",  # 1024 维
                input=query,
                extra_body={"text_type": "query"}  # 标记为查询文本
            )
            query_vector = response.data[0].embedding
            query_tokens = len(query) // 2
            
            # 追踪 Token 使用
            token_tracker.track_vectorization("query", query_tokens, cached=False)
            
            # 加入缓存
            if len(self.query_cache) >= self.cache_max_size:
                # 缓存满了，删除最旧的（简单 FIFO）
                first_key = next(iter(self.query_cache))
                del self.query_cache[first_key]
            
            self.query_cache[query_hash] = query_vector
            print(f"[RAG] 查询已缓存，消耗 {query_tokens} tokens")
        
        # 2. 构建过滤条件
        filter_expr = None
        if filter_doc_ids:
            # DashVector 过滤语法
            doc_filter = " or ".join([f'doc_id="{doc_id}"' for doc_id in filter_doc_ids])
            filter_expr = doc_filter
        
        # 3. 向量检索（多检索一些用于重排序）
        search_k = top_k * 5 if use_rerank else top_k * 3  # 增加检索数量
        result = self.collection.query(
            vector=query_vector,
            topk=search_k,
            include_vector=False,  # 不返回向量，节省带宽
            filter=filter_expr
        )
        
        if not result or not result.output:
            print(f"[RAG] 未找到相关内容")
            return {
                "chunks": [],
                "tokens_used": query_tokens,
                "query_count": 1
            }
        
        # 4. 处理结果，去重相邻片段
        chunks = []
        seen_docs = set()
        
        for doc in result.output:
            doc_id = doc.fields.get("doc_id")
            chunk_id = doc.fields.get("chunk_id")
            key = f"{doc_id}_{chunk_id}"
            
            if key not in seen_docs:
                chunks.append({
                    "text": doc.fields.get("text", ""),
                    "doc_id": doc_id,
                    "chunk_id": chunk_id,
                    "page": doc.fields.get("page"),  # 直接返回页码
                    "score": doc.score,
                    "metadata": {k: v for k, v in doc.fields.items() 
                               if k not in ["text", "doc_id", "chunk_id", "page"]}
                })
                seen_docs.add(key)
        
        # 5. 重排序（混合向量和关键词）
        if use_rerank and len(chunks) > top_k:
            chunks = self._rerank_chunks(query, chunks)
            print(f"[RAG] 重排序完成，使用混合得分")
        
        # 6. 返回 Top-K
        chunks = chunks[:top_k]
        
        print(f"[RAG] 检索到 {len(chunks)} 个相关片段，消耗 {query_tokens} tokens")
        return {
            "chunks": chunks,
            "tokens_used": query_tokens,
            "query_count": 1
        }
    
    async def delete_document(self, doc_id: str):
        """
        删除文档的所有片段
        
        Args:
            doc_id: 文档ID
        """
        # DashVector 不支持按字段批量删除，需要先查询再删除
        # 这里简化处理：通过 doc_id 前缀匹配删除
        try:
            # 查询该文档的所有片段ID
            result = self.collection.query(
                vector=[0.0] * 1024,  # 占位向量
                topk=1000,  # 假设单个文档不超过1000片段
                filter=f'doc_id="{doc_id}"',
                include_vector=False
            )
            
            if result and result.output:
                ids_to_delete = [doc.id for doc in result.output]
                self.collection.delete(ids=ids_to_delete)
                print(f"[RAG] 已删除文档 {doc_id} 的 {len(ids_to_delete)} 个片段")
            else:
                print(f"[RAG] 文档 {doc_id} 不存在")
        except Exception as e:
            print(f"[RAG] 删除文档失败: {e}")
    
    async def get_stats(self) -> Dict:
        """获取向量库统计信息"""
        try:
            stats = self.collection.stats()
            return {
                "total_vectors": stats.total_doc_count if hasattr(stats, 'total_doc_count') else 0,
                "collection_name": self.collection_name
            }
        except Exception as e:
            print(f"[RAG] 获取统计信息失败: {e}")
            return {"total_vectors": 0, "collection_name": self.collection_name}


# 全局实例（供其他模块导入）
rag_service = RAGService()
