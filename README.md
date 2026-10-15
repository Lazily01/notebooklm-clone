# NotebookLM Clone

一个功能丰富的中文 AI 文档助手，支持文档上传、智能问答、音频播客、视频生成、PPT 制作、思维导图等多种内容创作模式。

> 本项目是个人学习/实践项目，对标 Google NotebookLM 的核心理念，并扩展了更多中文场景下的实用功能。

---

## 功能特性

### 核心功能
- **多格式文档上传** —— 支持 PDF、Word、Excel、Markdown、EPUB、TXT、图片、音频等
- **AI 智能问答** —— 基于 RAG（检索增强生成），支持页码引用、流式输出
- **联网搜索** —— 可搜索网络内容并导入文档库进行问答

### 内容生成
- **音频概述** —— 生成双人对话式播客脚本，支持 TTS 语音合成
- **视频概述** —— 自动生成视频大纲 + AI 配图 + 语音合成
- **PPT / 演示文稿** —— 自动生成幻灯片，支持导出 PPTX / PDF
- **思维导图** —— 后端渲染 PNG 图片，前端直接展示
- **信息图** —— 一键生成文档信息图
- **闪卡 & 测验** —— 生成学习卡片和测试题
- **报告生成** —— 博客文章、学习笔记、自定义报告

### 其他特性
- **Token 成本统计** —— 透明化展示每次调用的 API 消耗
- **会话管理** —— 多轮对话历史保存
- **文档去重** —— 基于文件哈希自动跳过重复上传

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 后端 | Python + FastAPI + SQLAlchemy + SQLite |
| LLM | 阿里通义千问 (Qwen-Long / Qwen3-Plus) |
| Embedding | text-embedding-v4 (DashScope) |
| 向量库 | DashVector |
| TTS | Qwen3-TTS-Flash |
| 图片生成 | 通义万相 / 豆包 / 智谱 GLM |
| 思维导图渲染 | Markmap + Playwright |
| 视频合成 | MoviePy |

---

## 快速开始

### 前置要求
- Python 3.11+
- Node.js 18+
- （可选）Playwright + Chromium（思维导图渲染需要）

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/notebooklm-clone.git
cd notebooklm-clone
```

### 2. 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
# 阿里 DashScope（必须）
DASHSCOPE_API_KEY=your_dashscope_api_key

# 模型配置（可选，使用默认值即可）
QWEN_LONG_MODEL=qwen-long
QWEN_CREATIVE_MODEL=qwen3-plus
QWEN_IMAGE_MODEL=qwen-image-max

# 向量库 DashVector（必须）
DASHVECTOR_API_KEY=your_dashvector_api_key
DASHVECTOR_ENDPOINT=your_dashvector_endpoint

# SiliconFlow（音频转录 Whisper，可选）
SILICONFLOW_API_KEY=your_siliconflow_key

# 豆包/火山引擎（图片生成，可选）
ARK_API_KEY=your_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_IMAGE_MODEL=your_endpoint_id

# 智谱 GLM（图片生成备选，可选）
GLM_API_KEY=your_glm_api_key
```

> 获取 API Key：
> - [DashScope](https://dashscope.aliyun.com/)（千问 LLM + Embedding + TTS）
> - [DashVector](https://dashvector.console.aliyun.com/)（向量数据库）
> - [SiliconFlow](https://siliconflow.cn/)（Whisper 音频转录）
> - [火山引擎](https://console.volcengine.com/)（豆包图片生成）

### 3. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements_websearch.txt

# 思维导图渲染需要（可选）
pip install playwright
playwright install chromium
npm install -g markmap-cli
```

### 4. 安装前端依赖

```bash
cd ../frontend
npm install
```

### 5. 启动项目

**Windows（推荐）：**
```bash
# 在项目根目录
start.bat
```

**手动启动：**
```bash
# 终端 1：启动后端
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 终端 2：启动前端
cd frontend
npm run dev
```

访问前端：`http://localhost:3000`  
API 文档：`http://localhost:8000/docs`

---

## 项目结构

```
notebooklm-clone/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI 主入口
│   │   ├── database.py             # SQLite 数据库模型
│   │   └── services/
│   │       ├── llm_service.py      # 千问 LLM 调用
│   │       ├── rag_service.py      # RAG 检索（DashVector）
│   │       ├── tts_service.py      # 语音合成
│   │       ├── audio_service.py    # 音频转录（Whisper）
│   │       ├── video_service.py    # 视频合成
│   │       ├── ppt_service.py      # PPT 生成
│   │       ├── presentation_service.py  # 演示文稿 AI
│   │       ├── mindmap_markmap_renderer.py  # 思维导图渲染
│   │       ├── web_search_service.py      # 联网搜索
│   │       ├── web_scraper_service.py     # 网页爬取
│   │       ├── document_parser.py         # 文档解析
│   │       ├── token_tracker.py           # Token 统计
│   │       └── prompt_manager.py          # 动态 Prompt 管理
│   ├── requirements.txt
│   ├── requirements_websearch.txt
│   └── start.bat
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # 主应用
│   │   └── components/             # 功能组件
│   ├── package.json
│   └── vite.config.js
└── docs/
```

---

## 使用说明

### 文档上传
1. 点击左侧「上传文档」，支持拖拽或选择文件
2. 系统自动解析内容，PDF 扫描件会自动调用 Qwen-Long OCR
3. 文档自动向量化存入向量库，上传后即可问答

### 智能问答
1. 选择已上传的文档（可多选）
2. 在输入框提问，系统通过 RAG 检索相关片段后生成回答
3. PDF 文档会自动标注引用页码，点击可跳转原文

### 音频概述（播客）
1. 选择文档 → 点击「音频概述」
2. 选择风格：深度探讨 / 简要总结 / 批判分析 / 辩论
3. 生成双人对话脚本 + TTS 语音合成
4. 可下载 MP3 文件

### PPT 生成
1. 选择文档 → 点击「生成幻灯片」
2. 选择主题风格（商务 / 科技 / 学术 / 创意）
3. AI 自动生成大纲 → 编辑大纲 → 生成完整幻灯片
4. 支持导出 PPTX 和 PDF

---

## 注意事项

1. **API 费用**：本项目调用多个第三方 API（DashScope、DashVector、SiliconFlow 等），请注意控制使用频率，建议先在各平台了解计费规则。
2. **Windows 编码**：如果在 Windows PowerShell/CMD 下运行出现中文乱码，建议先执行 `chcp 65001` 切换到 UTF-8。
3. **Playwright**：思维导图渲染依赖 Playwright + Chromium，首次安装需要下载浏览器（约 100MB+）。
4. **向量库**：DashVector 是阿里云的托管服务，需要提前创建 Collection（名称默认为 `notebooklm`）。

---

## License

MIT License

---

## 致谢

- [Google NotebookLM](https://notebooklm.google.com/) —— 灵感来源
- [阿里 DashScope](https://dashscope.aliyun.com/) —— LLM / Embedding / TTS
- [Markmap](https://markmap.js.org/) —— 思维导图渲染
