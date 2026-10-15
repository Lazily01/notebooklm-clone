"""
分层摘要器 - 处理超长文档
"""
import asyncio
from typing import List


class HierarchicalSummarizer:
    """分层摘要器"""
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
        self.chunk_size = 10000  # 每块 10000 字符
        self.max_parallel = 5    # 最多并行处理 5 个块
    
    async def summarize_long_document(self, content: str, max_length: int = 500) -> str:
        """
        为超长文档生成摘要（分层处理）
        
        Args:
            content: 文档内容
            max_length: 最终摘要的最大长度
        
        Returns:
            摘要文本
        """
        content_length = len(content)
        
        # 如果文档较短，直接生成摘要
        if content_length <= self.chunk_size:
            return await self.llm_service.summarize(content)
        
        print(f"[HierarchicalSummarizer] 文档长度: {content_length} 字符，使用分层摘要")
        
        # 第一层：将文档分块，为每个块生成摘要
        chunks = self._split_into_chunks(content)
        print(f"[HierarchicalSummarizer] 分成 {len(chunks)} 个块")
        
        # 并行生成块摘要
        chunk_summaries = await self._summarize_chunks_parallel(chunks)
        print(f"[HierarchicalSummarizer] 生成了 {len(chunk_summaries)} 个块摘要")
        
        # 第二层：合并块摘要，生成最终摘要
        combined_summary = "\n\n".join(chunk_summaries)
        
        # 如果合并后的摘要仍然很长，再次摘要
        if len(combined_summary) > self.chunk_size:
            print(f"[HierarchicalSummarizer] 合并摘要过长，进行二次摘要")
            final_summary = await self._generate_final_summary(combined_summary, max_length)
        else:
            final_summary = await self._generate_final_summary(combined_summary, max_length)
        
        print(f"[HierarchicalSummarizer] 最终摘要长度: {len(final_summary)} 字符")
        return final_summary
    
    def _split_into_chunks(self, content: str) -> List[str]:
        """
        将文档分成多个块
        
        Args:
            content: 文档内容
        
        Returns:
            块列表
        """
        chunks = []
        for i in range(0, len(content), self.chunk_size):
            chunk = content[i:i + self.chunk_size]
            chunks.append(chunk)
        return chunks
    
    async def _summarize_chunks_parallel(self, chunks: List[str]) -> List[str]:
        """
        并行为多个块生成摘要
        
        Args:
            chunks: 块列表
        
        Returns:
            摘要列表
        """
        summaries = []
        
        # 分批并行处理（避免并发过多）
        for i in range(0, len(chunks), self.max_parallel):
            batch = chunks[i:i + self.max_parallel]
            
            # 并行处理这一批
            tasks = [self._summarize_chunk(idx + i, chunk) for idx, chunk in enumerate(batch)]
            batch_summaries = await asyncio.gather(*tasks)
            summaries.extend(batch_summaries)
        
        return summaries
    
    async def _summarize_chunk(self, idx: int, chunk: str) -> str:
        """
        为单个块生成摘要
        
        Args:
            idx: 块索引
            chunk: 块内容
        
        Returns:
            摘要
        """
        try:
            prompt = f"""请为以下文档片段生成简洁摘要（100-200字）：

片段 {idx + 1}：
{chunk}

要求：
1. 提取核心信息和关键观点
2. 保持逻辑连贯
3. 不要添加文档外的内容"""
            
            messages = [
                {"role": "system", "content": "你是一个专业的文档摘要助手。"},
                {"role": "user", "content": prompt}
            ]
            
            result = await self.llm_service._call_chat_api(messages)
            summary = result["content"]
            
            print(f"[HierarchicalSummarizer] 块 {idx + 1} 摘要完成，长度: {len(summary)} 字符")
            return summary
        
        except Exception as e:
            print(f"[HierarchicalSummarizer] 块 {idx + 1} 摘要失败: {e}")
            return f"[块 {idx + 1} 摘要生成失败]"
    
    async def _generate_final_summary(self, combined_summary: str, max_length: int) -> str:
        """
        基于块摘要生成最终摘要
        
        Args:
            combined_summary: 合并的块摘要
            max_length: 最大长度
        
        Returns:
            最终摘要
        """
        prompt = f"""请基于以下多个文档片段的摘要，生成一个完整、连贯的文档摘要（{max_length}字以内）：

{combined_summary}

要求：
1. 整合所有片段的核心信息
2. 保持逻辑连贯和结构清晰
3. 突出文档的主题和关键观点
4. 不要简单罗列，要形成完整的叙述"""
        
        messages = [
            {"role": "system", "content": "你是一个专业的文档摘要助手。"},
            {"role": "user", "content": prompt}
        ]
        
        result = await self.llm_service._call_chat_api(messages)
        return result["content"]


# 全局实例（需要在使用时传入 llm_service）
def create_hierarchical_summarizer(llm_service):
    return HierarchicalSummarizer(llm_service)
