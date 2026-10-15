# 博查AI搜索 API 配置指南

## 📝 简介

博查AI是国内最适合AI应用的搜索引擎，提供：
- ✅ 免费额度充足（注册即送）
- ✅ 国内服务，速度快（0.15s响应）
- ✅ 内容合规，符合国内规范
- ✅ 搜索质量高，支持长文本摘要
- ✅ 已服务 DeepSeek、阿里、腾讯等大厂

## 🚀 快速开始

### 1. 注册账号

访问：https://open.bocha.cn

点击右上角「注册」按钮，使用手机号或邮箱注册。

### 2. 获取 API Key

1. 登录后，进入「控制台」
2. 点击左侧菜单「API密钥」
3. 点击「创建API密钥」
4. 复制生成的 API Key

### 3. 配置到项目

打开 `backend/.env` 文件，找到：

```env
# 博查AI搜索 API（联网搜索）
BOCHA_API_KEY=your_bocha_api_key_here
```

将 `your_bocha_api_key_here` 替换为你的 API Key：

```env
BOCHA_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. 测试搜索功能

运行测试脚本：

```bash
cd backend
python test_bocha_search.py
```

如果看到搜索结果，说明配置成功！

## 💰 价格说明

### Web Search API（网页搜索）
- **免费额度**：注册即送
- **付费价格**：用完免费额度后按次计费
- **推荐场景**：文档问答、AI助手、知识检索

### AI Search API（AI搜索）
- 包含网页搜索 + 模态卡（天气、百科等）
- 可选：大模型生成答案
- 适合：智能问答、AI搜索引擎

## 📚 API 文档

- 官方文档：https://open.bocha.cn/docs
- Web Search API：https://open.bocha.cn/docs/web-search
- AI Search API：https://open.bocha.cn/docs/ai-search

## ❓ 常见问题

### Q: 免费额度有多少？
A: 注册即送，具体额度以官网为准。用完后可以按需充值。

### Q: 搜索结果是否合规？
A: 是的，博查的搜索结果符合国内内容安全规范，数据不出海。

### Q: 支持哪些搜索类型？
A: 支持网页、图片、视频搜索，以及天气、百科、股票等模态卡。

### Q: 响应速度如何？
A: 平均响应时延 0.15s，非常快。

## 🔧 故障排查

### 1. 提示 "未配置 BOCHA_API_KEY"
- 检查 `.env` 文件是否正确配置
- 确认 API Key 没有多余的空格或引号

### 2. 返回 401 错误
- API Key 可能无效或过期
- 重新生成 API Key

### 3. 返回 429 错误
- 超过免费额度限制
- 前往控制台充值

## 📞 技术支持

- 官方文档：https://open.bocha.cn/docs
- 客服支持：通过官网联系客服
