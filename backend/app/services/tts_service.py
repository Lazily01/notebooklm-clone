"""
Qwen TTS 语音合成服务 - 阿里云通义千问语音引擎
"""
import os
import uuid
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import dashscope

load_dotenv()

# 设置 API 地址
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

class TTSService:
    """Qwen TTS 语音合成服务"""
    
    def __init__(self):
        # 音频保存目录
        self.audio_dir = Path(__file__).parent.parent.parent / "audio_files"
        self.audio_dir.mkdir(exist_ok=True)
        self.api_key = os.getenv("DASHSCOPE_API_KEY")
        
        # qwen3-tts-flash 音色配置
        # 可选: Cherry(女声温柔), Serena(女声知性), Ethan(男声稳重), Chelsie(女声活泼)
        self.voices = {
            "male": "Ethan",      # 男声 - 稳重专业
            "female": "Cherry",   # 女声 - 温柔自然
        }
        
        # SSML 情感参数配置
        self.emotion_params = {
            "neutral": {"rate": "100", "pitch": "0", "volume": "50"},      # 中性
            "excited": {"rate": "115", "pitch": "30", "volume": "55"},     # 兴奋
            "serious": {"rate": "85", "pitch": "-20", "volume": "48"},     # 严肃
            "gentle": {"rate": "95", "pitch": "10", "volume": "45"},       # 温柔
            "energetic": {"rate": "120", "pitch": "40", "volume": "58"},   # 有活力
        }
    
    def _wrap_with_ssml(self, text: str, emotion: str = "neutral", add_pauses: bool = True) -> str:
        """
        将文本包装为 SSML 格式
        
        Args:
            text: 原始文本
            emotion: 情感类型 (neutral/excited/serious/gentle/energetic)
            add_pauses: 是否在句子间自动添加停顿
            
        Returns:
            SSML 格式的文本
        """
        import re
        
        # 获取情感参数
        params = self.emotion_params.get(emotion, self.emotion_params["neutral"])
        
        # 转义 XML 特殊字符
        text = text.replace("&", "&amp;")
        text = text.replace("<", "&lt;")
        text = text.replace(">", "&gt;")
        text = text.replace('"', "&quot;")
        text = text.replace("'", "&apos;")
        
        # 如果需要添加停顿，在句子结束符后添加 break 标签
        if add_pauses:
            # 在句号、问号、感叹号后添加短暂停顿
            text = re.sub(r'([。！？])', r'\1<break time="300ms"/>', text)
            # 在逗号、顿号后添加更短的停顿
            text = re.sub(r'([，、])', r'\1<break time="150ms"/>', text)
        
        # 构造 SSML
        ssml = f'''<speak rate="{params['rate']}" pitch="{params['pitch']}" volume="{params['volume']}">
{text}
</speak>'''
        
        return ssml
    
    async def generate_audio_stream(self, text: str, voice: str = "female"):
        """
        流式生成语音（返回音频流）
        
        Args:
            text: 要转换的文本
            voice: 音色 (male/female)
            
        Yields:
            音频数据块（PCM格式）
        """
        voice_name = self.voices.get(voice, self.voices["female"])
        
        print(f"[TTS-Stream] 开始流式合成: voice={voice_name}, text={text[:50]}...")
        
        try:
            # 使用流式调用
            responses = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
                model="qwen3-tts-flash-2025-11-27",
                api_key=self.api_key,
                text=text,
                voice=voice_name,
                stream=True  # 启用流式输出
            )
            
            # 流式返回音频数据
            for response in responses:
                if hasattr(response, 'output') and hasattr(response.output, 'audio'):
                    audio_data = response.output.audio
                    # 返回 Base64 编码的 PCM 数据
                    yield audio_data
                    
        except Exception as e:
            print(f"[TTS-Stream] 流式合成失败: {e}")
            raise
    
    async def generate_audio(self, text: str, voice: str = "female", max_retries: int = 3, use_ssml: bool = False, emotion: str = "neutral", use_stream: bool = False) -> str:
        """
        生成语音
        
        Args:
            text: 要转换的文本
            voice: 音色 (male/female)
            max_retries: 最大重试次数
            use_ssml: 是否使用 SSML 增强（默认关闭，qwen3-TTS不支持）
            emotion: 情感类型 (neutral/excited/serious/gentle/energetic)
            use_stream: 是否使用流式输出（更快）
            
        Returns:
            音频文件路径
        """
        import asyncio
        
        voice_name = self.voices.get(voice, self.voices["female"])
        
        # 如果启用 SSML，包装文本
        if use_ssml and not text.strip().startswith('<speak'):
            text = self._wrap_with_ssml(text, emotion=emotion, add_pauses=True)
            print(f"[TTS] 使用 SSML 增强，情感: {emotion}")
        
        # 生成唯一文件名（qwen-tts 返回 wav 格式）
        audio_id = str(uuid.uuid4())[:8]
        audio_file = self.audio_dir / f"{audio_id}.wav"
        
        for attempt in range(max_retries):
            try:
                print(f"[TTS] 开始合成 (尝试 {attempt + 1}/{max_retries}): voice={voice_name}, text={text[:50]}...")
                
                import requests
                
                # 按官方示例：dashscope.audio.qwen_tts.SpeechSynthesizer.call
                response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
                    model="qwen3-tts-flash-2025-11-27",
                    api_key=self.api_key,
                    text=text,
                    voice=voice_name,
                    stream=use_stream  # 支持流式输出
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
                            with open(audio_file, 'wb') as f:
                                f.write(audio_response.content)
                            print(f"[TTS] 音频已保存: {audio_file}, 大小: {len(audio_response.content)} bytes")
                            return str(audio_file)
                
                # 检查是否是速率限制错误
                if hasattr(response, 'code') and response.code == "Throttling.RateQuota":
                    print(f"[TTS] 触发速率限制，等待 10 秒后重试...")
                    await asyncio.sleep(10)
                    continue
                
                raise Exception(f"TTS 返回错误: {response}")
                        
            except Exception as e:
                print(f"[TTS] 尝试 {attempt + 1} 失败: {e}")
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # 递增等待时间
                    print(f"[TTS] {wait_time}秒后重试...")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"[TTS] 所有重试都失败了")
                    raise
    
    async def generate_dialogue(self, dialogues: list, use_ssml: bool = False) -> str:
        """
        生成对话音频（两人对话，支持 SSML 情感控制）
        
        Args:
            dialogues: 对话列表 [{"speaker": "A/B", "text": "...", "emotion": "..."}]
            use_ssml: 是否使用 SSML 增强
            
        Returns:
            合并后的音频文件路径
        """
        audio_files = []
        
        for dialogue in dialogues:
            speaker = dialogue.get("speaker", "A")
            text = dialogue.get("text", "")
            emotion = dialogue.get("emotion", "neutral")  # 支持每段对话指定情感
            
            if not text:
                continue
                
            # A用女声，B用男声
            voice = "female" if speaker == "A" else "male"
            
            # 根据说话者自动调整情感倾向
            if emotion == "neutral":
                # A（女声）默认温柔一些，B（男声）默认稳重一些
                emotion = "gentle" if speaker == "A" else "neutral"
            
            audio_file = await self.generate_audio(text, voice, use_ssml=use_ssml, emotion=emotion)
            audio_files.append(audio_file)
            
            # 避免速率限制：测试时关闭
            # print(f"[TTS] 等待 7 秒避免速率限制...")
            # await asyncio.sleep(7)
        
        if not audio_files:
            raise Exception("没有生成任何音频")
        
        # 如果只有一个文件，直接返回
        if len(audio_files) == 1:
            return audio_files[0]
        
        # 合并音频文件
        merged_file = await self._merge_audio_files(audio_files)
        
        # 删除临时文件
        for f in audio_files:
            try:
                os.remove(f)
            except:
                pass
                
        return merged_file
    
    async def _merge_audio_files(self, audio_files: list) -> str:
        """合并多个 wav 音频文件（按顺序）"""
        import wave
        import io
        
        merged_id = str(uuid.uuid4())[:8]
        merged_file = self.audio_dir / f"merged_{merged_id}.wav"
        
        print(f"[TTS] 开始合并 {len(audio_files)} 个音频文件...")
        
        # 按顺序读取所有音频数据
        all_frames = []
        params = None
        
        for i, audio_file in enumerate(audio_files):
            try:
                with wave.open(audio_file, 'rb') as wf:
                    if params is None:
                        params = wf.getparams()
                    frames = wf.readframes(wf.getnframes())
                    all_frames.append(frames)
                    print(f"[TTS] 读取第 {i+1} 个音频: {len(frames)} bytes")
            except Exception as e:
                print(f"[TTS] 读取音频失败: {audio_file}, 错误: {e}")
        
        if not all_frames or params is None:
            raise Exception("没有有效的音频数据")
        
        # 写入合并后的文件
        with wave.open(str(merged_file), 'wb') as output:
            output.setparams(params)
            for frames in all_frames:
                output.writeframes(frames)
        
        print(f"[TTS] 音频合并完成: {merged_file}")
        return str(merged_file)


# 全局实例
tts_service = TTSService()
