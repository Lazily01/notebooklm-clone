import os
import time
import asyncio
import tempfile
import requests
import struct
import io
from dotenv import load_dotenv
from typing import Dict, Optional

load_dotenv()


def get_audio_duration(content: bytes, filename: str) -> float:
    """估算音频时长（秒）"""
    ext = os.path.splitext(filename)[1].lower()
    
    try:
        if ext == '.wav':
            # WAV 文件：从头部读取采样率和数据大小
            with io.BytesIO(content) as f:
                f.seek(24)
                sample_rate = struct.unpack('<I', f.read(4))[0]
                f.seek(40)
                data_size = struct.unpack('<I', f.read(4))[0]
                f.seek(34)
                bits_per_sample = struct.unpack('<H', f.read(2))[0]
                f.seek(22)
                channels = struct.unpack('<H', f.read(2))[0]
                duration = data_size / (sample_rate * channels * bits_per_sample / 8)
                return duration
        elif ext == '.mp3':
            # MP3：粗略估算，假设 128kbps
            return len(content) / (128 * 1024 / 8)
        elif ext == '.m4a':
            # M4A：粗略估算，假设 128kbps
            return len(content) / (128 * 1024 / 8)
        else:
            # 默认按 128kbps 估算
            return len(content) / (128 * 1024 / 8)
    except:
        # 出错时按文件大小粗略估算
        return len(content) / (128 * 1024 / 8)

# 存储转录任务状态
transcription_tasks: Dict[str, dict] = {}

# SiliconFlow API 配置
SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")


class AudioService:
    """音频转文字服务（使用 SiliconFlow Whisper）"""
    
    def __init__(self):
        self.api_key = SILICONFLOW_API_KEY
        self.api_url = "https://api.siliconflow.cn/v1/audio/transcriptions"
    
    async def start_transcription(self, content: bytes, filename: str, doc_id: str) -> str:
        transcription_tasks[doc_id] = {"status": "processing", "text": "", "error": None}
        asyncio.create_task(self._transcribe_async(content, filename, doc_id))
        return "正在转录音频，请稍候..."
    
    def get_transcription_status(self, doc_id: str) -> Optional[dict]:
        return transcription_tasks.get(doc_id)
    
    async def _transcribe_async(self, content: bytes, filename: str, doc_id: str):
        """后台异步转录 - 使用 SiliconFlow Whisper"""
        temp_path = None
        try:
            print(f"[Audio] 开始 Whisper 转写: {filename}, {len(content)} bytes")
            
            # 保存到临时文件
            ext = os.path.splitext(filename)[1].lower() or '.mp3'
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
                f.write(content)
                temp_path = f.name
            
            # 调用 SiliconFlow Whisper API
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            with open(temp_path, 'rb') as f:
                files = {
                    "file": (filename, f, "audio/mpeg"),
                    "model": (None, "FunAudioLLM/SenseVoiceSmall"),
                }
                
                print(f"[Audio] 调用 SiliconFlow API...")
                resp = requests.post(self.api_url, headers=headers, files=files, timeout=300)
            
            print(f"[Audio] 响应状态: {resp.status_code}")
            
            if resp.status_code != 200:
                raise Exception(f"API 错误: {resp.status_code} - {resp.text}")
            
            result = resp.json()
            print(f"[Audio] 响应: {result}")
            
            import re
            
            text = result.get("text", "")
            # 过滤掉 SenseVoice 的特殊标记
            text = re.sub(r'<\|[^|]+\|>', '', text)
            # 过滤掉 emoji 表情符号
            text = re.sub(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF\U0001FA00-\U0001FAFF]', '', text)
            text = text.strip()
            
            # 估算音频时长
            duration = get_audio_duration(content, filename)
            print(f"[Audio] 估算时长: {duration:.1f} 秒")
            
            # 按句子分段并添加时间戳
            if text and duration > 0:
                # 按标点符号分句
                sentences = re.split(r'([。！？.!?])', text)
                # 合并标点和句子
                merged = []
                for i in range(0, len(sentences) - 1, 2):
                    s = sentences[i] + (sentences[i + 1] if i + 1 < len(sentences) else '')
                    s = s.strip()
                    if s:
                        merged.append(s)
                # 处理最后一个没有标点的部分
                if len(sentences) % 2 == 1 and sentences[-1].strip():
                    merged.append(sentences[-1].strip())
                
                if merged:
                    # 按字符数比例分配时间
                    total_chars = sum(len(s) for s in merged)
                    current_time = 0
                    formatted_parts = []
                    
                    for s in merged:
                        # 格式化时间 MM:SS
                        mins = int(current_time // 60)
                        secs = int(current_time % 60)
                        time_str = f"[{mins:02d}:{secs:02d}]"
                        formatted_parts.append(f"{time_str} {s}")
                        # 按比例增加时间
                        current_time += (len(s) / total_chars) * duration
                    
                    text = "\n".join(formatted_parts)
            
            print(f"[Audio] 完成: {text[:100] if text else '无'}...")
            
            transcription_tasks[doc_id] = {"status": "completed", "text": text, "error": None}
                
        except Exception as e:
            import traceback
            print(f"[Audio] 异常: {e}")
            print(traceback.format_exc())
            transcription_tasks[doc_id] = {"status": "failed", "text": "", "error": str(e)}
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
    
    async def transcribe(self, content: bytes, filename: str) -> str:
        doc_id = f"temp_{time.time()}"
        await self.start_transcription(content, filename, doc_id)
        for _ in range(300):
            await asyncio.sleep(1)
            s = self.get_transcription_status(doc_id)
            if s and s["status"] == "completed": return s["text"]
            if s and s["status"] == "failed": raise Exception(s["error"])
        raise Exception("超时")
