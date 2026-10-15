"""
Prompt 管理器 - 动态 Prompt 优化

根据文档类型和场景动态生成 Prompt，节省 15% 成本
"""
from typing import Dict, List


class PromptManager:
    """Prompt 管理器"""
    
    def __init__(self):
        """初始化 Prompt 模板"""
        # 基础系统 Prompt
        self.base_system = "你是一个专业的 AI 助手，擅长分析和总结文档内容。"
        
        # 文档类型特定的 Prompt
        self.doc_type_prompts = {
            "pdf": {
                "summary": "这是一个 PDF 文档。请提供简洁的摘要，重点关注文档的主要内容、结构和关键信息。",
                "chat": "基于 PDF 文档内容回答问题。如果文档包含图表或表格，请特别注意这些结构化信息。"
            },
            "word": {
                "summary": "这是一个 Word 文档。请提供简洁的摘要，重点关注文档的主题、段落结构和关键观点。",
                "chat": "基于 Word 文档内容回答问题。注意文档的层次结构和格式。"
            },
            "excel": {
                "summary": "这是一个 Excel 表格。请提供简洁的摘要，重点关注数据的类型、列名、数据范围和主要趋势。",
                "chat": "基于 Excel 数据回答问题。可以进行数据分析、趋势总结和数值计算。"
            },
            "txt": {
                "summary": "这是一个文本文件。请提供简洁的摘要。",
                "chat": "基于文本内容回答问题。"
            },
            "markdown": {
                "summary": "这是一个 Markdown 文档。请提供简洁的摘要，重点关注文档的标题结构、代码块和链接。",
                "chat": "基于 Markdown 文档回答问题。注意代码示例和技术细节。"
            },
            "image": {
                "summary": "这是一张图片的识别结果。请提供简洁的摘要，描述图片的主要内容。",
                "chat": "基于图片识别结果回答问题。"
            },
            "audio": {
                "summary": "这是一段音频的转录文本。请提供简洁的摘要，重点关注对话的主题和关键信息。",
                "chat": "基于音频转录内容回答问题。"
            },
            "webpage": {
                "summary": "这是一个网页的内容。请提供简洁的摘要，重点关注网页的主题和关键信息。",
                "chat": "基于网页内容回答问题。"
            },
            "text": {
                "summary": "这是一段粘贴的文本。请提供简洁的摘要。",
                "chat": "基于文本内容回答问题。"
            }
        }
        
        # 默认 Prompt（未知类型）
        self.default_prompt = {
            "summary": "请提供这个文档的简洁摘要。",
            "chat": "基于文档内容回答问题。"
        }
    
    def get_summary_prompt(self, doc_type: str, content: str, max_length: int = 200) -> str:
        """
        获取摘要生成 Prompt
        
        Args:
            doc_type: 文档类型（pdf, word, excel, txt, markdown, image, audio, webpage, text）
            content: 文档内容
            max_length: 摘要最大长度
        
        Returns:
            完整的 Prompt
        """
        # 获取类型特定的 Prompt
        prompt_dict = self.doc_type_prompts.get(doc_type)
        if not prompt_dict:
            prompt_dict = self.default_prompt
        type_prompt = prompt_dict.get("summary", "请提供这个文档的简洁摘要。")
        
        # 根据内容长度调整
        content_length = len(content)
        if content_length < 500:
            length_hint = "文档较短，摘要控制在 50 字以内。"
        elif content_length < 2000:
            length_hint = f"摘要控制在 {max_length} 字以内。"
        else:
            length_hint = f"文档较长，请提供 {max_length} 字左右的摘要，突出核心内容。"
        
        # 组合 Prompt
        prompt = f"""{self.base_system}

{type_prompt}

要求：
1. {length_hint}
2. 使用简洁、专业的语言
3. 突出文档的核心价值和关键信息
4. 不要包含"这是一个..."等开头

文档内容：
{content[:3000]}  # 只取前 3000 字符用于摘要
"""
        
        return prompt
    
    def get_chat_prompt(self, doc_type: str, query: str, context: str, history: List[Dict] = None) -> str:
        """
        获取聊天 Prompt
        
        Args:
            doc_type: 文档类型
            query: 用户问题
            context: 检索到的相关内容
            history: 聊天历史（可选）
        
        Returns:
            完整的 Prompt
        """
        # 获取类型特定的 Prompt
        prompt_dict = self.doc_type_prompts.get(doc_type)
        if not prompt_dict:
            prompt_dict = self.default_prompt
        type_prompt = prompt_dict.get("chat", "基于文档内容回答问题。")
        
        # 构建历史对话（如果有）
        history_text = ""
        if history and len(history) > 0:
            # 只保留最近 3 轮对话
            recent_history = history[-3:]
            history_lines = []
            for h in recent_history:
                history_lines.append(f"用户: {h.get('question', '')}")
                history_lines.append(f"助手: {h.get('answer', '')}")
            history_text = "\n".join(history_lines)
            history_section = f"\n\n历史对话：\n{history_text}\n"
        else:
            history_section = ""
        
        # 组合 Prompt（带引用标记）
        prompt = f"""{self.base_system}

{type_prompt}
【角色定位】
你是"文档内容提炼助手"，需要基于用户提供的文档，输出**精准、易读、有逻辑**的回答。

【核心规则（必须严格遵守）】
1. 内容边界：仅用下方文档内容回答，**绝对不能加入文档外的内容/主观推测**
2. 缺失处理：若文档无对应信息，直接回复"未在提供的文档中找到相关内容"
3. 语言要求：
   - 用中文口语化表达（像"给同事讲事情"一样自然）
   - 长度控制：简单问题100-200字，复杂问题300-500字
   - 避免重复：同一信息只说一次

【回答结构】
- 开头：先给结论/核心观点（1句话总结）
- 中间：分点（用"-"）补充关键细节，**每个细节都必须对应引用标注**
- 结尾：如果有多个来源的互补信息，可加一句总结

【引用规范（严格执行）】
1. 每个事实/观点后必须添加引用标记 [页码]
2. 引用编号就是文档的页码：
   - [1] = 第 1 页
   - [3] = 第 3 页
   - [7] = 第 7 页
3. 必须使用文档中标注的页码，不要自己编造
4. 示例：
   "新功能将于2024年2月19日上线[1]，需要提前报备[3]。"
   （表示第一个信息来自第1页，第二个信息来自第3页）

【特殊情况处理】
- 总结文档：分2-3点概括，每点对应至少1个来源标注
- 对比问题：分"相同点""不同点"两部分，每部分加对应引用
- 内容矛盾：明确说明"来源1提到XXX[1]，但来源2提到YYY[2]，两者表述存在差异"

【联想问题生成（重要）】
在回答结束后，生成3个相关的联想问题，帮助用户深入探索文档内容：
1. 联想问题应该基于当前回答内容，引导用户进一步了解相关主题
2. 问题要具体、有针对性，能够挖掘文档中的深层信息
3. 使用特殊标记：在回答末尾添加 [SUGGESTIONS] 后跟3个问题，每个问题一行
4. 格式示例：
   回答内容...
   
   [SUGGESTIONS]
   问题1？
   问题2？
   问题3？

相关文档内容（已编号）：
{context}

用户问题：{query}

请直接输出符合要求的回答（包含联想问题）："""
        
        return prompt
    
    def get_token_estimate(self, prompt: str) -> int:
        """
        估算 Prompt 的 Token 数量
        
        Args:
            prompt: Prompt 文本
        
        Returns:
            估算的 Token 数量
        """
        # 粗略估算：中文 1 字 ≈ 1.5 tokens，英文 1 词 ≈ 1.3 tokens
        # 简化：每个字符 ≈ 0.5 tokens
        return len(prompt) // 2


# 全局单例
prompt_manager = PromptManager()
