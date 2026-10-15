# Miniblink 思维导图渲染器 - 测试指南

## 快速开始

### 文件清单
```
mindmap-renderer.js    - 核心渲染器（ES5 纯 JavaScript）
mindmap-renderer.css   - 样式文件（Chrome 49 兼容）
mindmap-test.html      - 测试页面
```

## 方法一：使用 Miniblink 官方工具（推荐）

### 1. 下载 Miniblink
- 访问：https://github.com/weolar/miniblink49
- 下载最新 Release 版本
- 或下载 MB Browser（miniblink 官方浏览器）

### 2. 运行测试
```
方式 A：使用 MB Browser
1. 解压 MB Browser
2. 运行 mb.exe
3. 在地址栏输入：file:///C:/path/to/mindmap-test.html
4. 查看渲染效果

方式 B：使用 wke_demo
1. 找到 miniblink SDK 中的 wke_demo.exe
2. 运行后选择 "打开文件"
3. 选择 mindmap-test.html
```

## 方法二：编写简单的 C++ 测试程序

### 最小示例代码
```cpp
#include "wke.h"
#include <windows.h>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, 
                   LPSTR lpCmdLine, int nCmdShow) {
    wkeInitialize();
    
    wkeWebView webView = wkeCreateWebWindow(WKE_WINDOW_TYPE_POPUP, 
                                            NULL, 0, 0, 1200, 800);
    
    // 修改为你的实际路径
    wkeLoadFile(webView, L"file:///C:/Users/CF/Desktop/AI/notebooks/notebooklm-clone/frontend/public/mindmap-test.html");
    
    wkeShowWindow(webView, TRUE);
    
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    wkeDestroyWebView(webView);
    wkeFinalize();
    return 0;
}
```

### 编译命令
```bash
# 使用 MinGW
g++ test.cpp -o test.exe -I./miniblink/include -L./miniblink/lib -lnode

# 使用 Visual Studio
cl test.cpp /I"miniblink/include" /link miniblink.lib
```

## 方法三：使用现有的 Miniblink 应用

一些桌面应用使用了 miniblink 内核，可以直接测试：
1. 找到使用 miniblink 的应用
2. 在应用中打开本地 HTML 文件
3. 查看渲染效果

## 兼容性检查清单

在 miniblink 中打开测试页面后，检查以下功能：

### 基础渲染
- [ ] 页面正常加载，无白屏
- [ ] 左侧编辑器正常显示
- [ ] 右侧思维导图正常显示
- [ ] 文字清晰可读

### 布局效果
- [ ] 思维导图横向展开（从左到右）
- [ ] 根节点在最左侧
- [ ] 子节点向右延伸
- [ ] 节点间距合理

### 连接线
- [ ] 节点之间有连接线
- [ ] 单个子节点只有横线，无竖线
- [ ] 多个子节点有横线 + 竖线
- [ ] 连接线颜色与分支颜色一致
- [ ] 无多余的竖线

### 配色方案
- [ ] 根节点为白色背景 + 黑色边框
- [ ] 主分支有不同颜色（红、蓝、绿等）
- [ ] 子分支为对应的浅色调
- [ ] 颜色过渡自然

### 交互功能
- [ ] 点击 "渲染思维导图" 按钮有效
- [ ] 点击节点前的 +/- 可以展开/收起
- [ ] 修改 Markdown 后重新渲染正常
- [ ] 鼠标悬停节点有阴影效果
- [ ] 页面可以正常滚动

### 控制台检查
- [ ] 打开开发者工具（如果 miniblink 支持）
- [ ] 查看是否有 JavaScript 错误
- [ ] 查看是否有 CSS 警告

## 常见问题排查

### 问题 1：页面无法加载
**原因**：文件路径错误
**解决**：
- 使用绝对路径：`file:///C:/完整路径/mindmap-test.html`
- 确保路径中没有中文或特殊字符

### 问题 2：样式错乱
**原因**：CSS 不兼容
**解决**：
- 检查 miniblink 版本
- 查看控制台 CSS 错误
- 尝试移除 `display: flex`，只保留 `display: -webkit-box`

### 问题 3：JavaScript 报错
**原因**：使用了不兼容的 API
**解决**：
- 查看具体错误信息
- 检查是否使用了 ES6+ 语法
- 确认所有代码都是 ES5

### 问题 4：连接线不显示
**原因**：CSS 伪元素不支持
**解决**：
- 检查 miniblink 对 `::before` 和 `::after` 的支持
- 可能需要降级为 DOM 元素实现连接线

## 性能测试

在 miniblink 中测试以下场景：
1. **小型思维导图**（10-20 个节点）- 应流畅
2. **中型思维导图**（50-100 个节点）- 应可接受
3. **大型思维导图**（200+ 个节点）- 可能卡顿

如果性能不佳，考虑：
- 减少 CSS 动画
- 简化 DOM 结构
- 使用虚拟滚动

## 获取帮助

如果遇到问题，请记录：
1. Miniblink 版本号
2. 具体错误信息（截图）
3. 控制台输出
4. 问题复现步骤

然后反馈给开发者进行修复。
