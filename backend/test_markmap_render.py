"""
测试 Markmap 思维导图渲染
"""
import sys
import asyncio
sys.path.insert(0, '.')

from app.services.mindmap_markmap_renderer import MindmapMarkmapRenderer

test_markdown = """
# 人工智能发展史
## 起源阶段
### 1950年代
#### 图灵测试提出
#### 达特茅斯会议
### 1960年代
#### 专家系统诞生
## 发展阶段
### 1980年代
#### 神经网络复兴
### 1990年代
#### 深度学习理论
## 突破阶段
### 2010年代
#### AlphaGo 战胜人类
### 2020年代
#### GPT 系列模型
"""

async def test_render():
    print("=" * 60)
    print("测试 Markmap 渲染")
    print("=" * 60)
    
    try:
        renderer = MindmapMarkmapRenderer(output_dir="static/mindmaps")
        print("[OK] 渲染器创建成功")
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        print("\n请先安装 markmap-cli:")
        print("  npm install -g markmap-cli")
        return False
    
    try:
        print("\n开始渲染...")
        full_path, relative_path = await renderer.render_to_image(
            markdown=test_markdown,
            filename="test_markmap",
            width=1920,
            height=1080
        )
        
        print("[OK] 渲染成功！")
        print(f"  完整路径: {full_path}")
        print(f"  相对路径: {relative_path}")
        
        print("\n" + "=" * 60)
        print("[SUCCESS] 测试通过！")
        print("=" * 60)
        print(f"\n请查看生成的图片：{full_path}")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] 渲染失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_render())
    sys.exit(0 if success else 1)
