"""视频合成服务 - 将配图+音频合成为视频"""
import os
import tempfile
import asyncio
import httpx
from pathlib import Path
from typing import List, Optional


class VideoService:
    """视频合成服务"""
    
    def __init__(self, llm_service):
        self.llm_service = llm_service
        self.output_dir = Path(tempfile.gettempdir()) / "video_output"
        self.output_dir.mkdir(exist_ok=True)
    
    async def download_image(self, url: str, output_path: str) -> bool:
        """下载图片到本地"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    with open(output_path, 'wb') as f:
                        f.write(response.content)
                    return True
        except Exception as e:
            print(f"[Video] 下载图片失败: {e}")
        return False
    
    async def generate_video_from_outline(
        self, 
        outline: List[dict], 
        doc_id: str,
        voice: str = "Cherry"
    ) -> Optional[str]:
        """从大纲生成完整视频
        
        Args:
            outline: 视频大纲，包含 narration, image_url 等
            doc_id: 文档ID
            voice: TTS 音色
        
        Returns:
            视频文件路径
        """
        try:
            work_dir = self.output_dir / doc_id
            work_dir.mkdir(exist_ok=True)
            
            segments = []  # 存储每个片段的信息
            MAX_SECTIONS = 2  # 测试模式：只处理前2个章节
            
            for i, section in enumerate(outline[:MAX_SECTIONS]):
                print(f"[Video] 处理第 {i+1}/{len(outline)} 章...")
                
                narration = section.get("narration", "")
                image_url = section.get("image_url")
                
                if not narration:
                    continue
                
                # 1. 生成音频
                audio_path = str(work_dir / f"audio_{i}.mp3")
                try:
                    self.llm_service.text_to_speech(narration, audio_path, voice)
                except Exception as e:
                    print(f"[Video] 第 {i+1} 章音频生成失败: {e}")
                    continue
                
                # 2. 下载图片（如果有）
                image_path = None
                if image_url:
                    image_path = str(work_dir / f"image_{i}.png")
                    if not await self.download_image(image_url, image_path):
                        image_path = None
                
                segments.append({
                    "index": i,
                    "audio_path": audio_path,
                    "image_path": image_path,
                    "title": section.get("title", f"第{i+1}章")
                })
            
            if not segments:
                raise Exception("没有可用的片段")
            
            # 3. 合成视频
            output_path = str(work_dir / f"video_{doc_id}.mp4")
            await self._compose_video(segments, output_path)
            
            return output_path
            
        except Exception as e:
            print(f"[Video] 视频生成失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _compose_video(self, segments: List[dict], output_path: str):
        """使用 moviepy 合成视频"""
        # moviepy 2.x 使用新的导入方式
        from moviepy import (
            ImageClip, AudioFileClip, concatenate_videoclips, 
            ColorClip, CompositeVideoClip
        )
        
        clips = []
        
        for seg in segments:
            audio_path = seg["audio_path"]
            image_path = seg.get("image_path")
            
            # 加载音频获取时长
            audio = AudioFileClip(audio_path)
            duration = audio.duration
            
            if image_path and os.path.exists(image_path):
                # 有图片：用图片作为背景
                clip = ImageClip(image_path, duration=duration)
                # 调整到 1280x720
                clip = clip.resized(height=720)
                if clip.w < 1280:
                    # 居中放置在黑色背景上
                    bg = ColorClip(size=(1280, 720), color=(0, 0, 0), duration=duration)
                    clip = CompositeVideoClip([bg, clip.with_position("center")])
                else:
                    clip = clip.resized(width=1280)
            else:
                # 无图片：用纯色背景
                clip = ColorClip(size=(1280, 720), color=(30, 30, 40), duration=duration)
            
            # 添加音频
            clip = clip.with_audio(audio)
            clips.append(clip)
        
        # 拼接所有片段
        final = concatenate_videoclips(clips, method="compose")
        
        # 导出视频
        print(f"[Video] 开始导出视频...")
        final.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            threads=4,
            preset="medium"
        )
        print(f"[Video] 视频导出完成: {output_path}")
        
        # 清理
        final.close()
        for clip in clips:
            clip.close()
