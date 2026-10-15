/**
 * Miniblink 兼容的思维导图渲染器
 * 纯 ES5 语法 + 原生 DOM 实现
 * 适配 Chrome 49 内核
 */

(function(window) {
  'use strict';

  /**
   * 思维导图渲染器构造函数
   */
  function MindmapRenderer(options) {
    this.container = options.container;
    this.colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
  }

  /**
   * 获取行的缩进层级
   */
  MindmapRenderer.prototype.getIndentLevel = function(line) {
    var trimmed = line.trim();
    
    // 支持 # 标题格式
    if (trimmed.indexOf('#') === 0) {
      var hashCount = 0;
      for (var i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '#') {
          hashCount++;
        } else {
          break;
        }
      }
      return hashCount - 1; // # 是 level 0, ## 是 level 1
    }
    
    // 支持 - 列表格式（缩进）
    var spaces = 0;
    for (var i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        spaces++;
      } else {
        break;
      }
    }
    return Math.floor(spaces / 2);
  };

  /**
   * 提取文本内容
   */
  MindmapRenderer.prototype.extractText = function(line) {
    var trimmed = line.trim();
    // 移除 # 或 - 或 * 前缀
    trimmed = trimmed.replace(/^#+\s*/, '');  // 移除 #
    trimmed = trimmed.replace(/^[\-\*]\s*/, '');  // 移除 - 或 *
    return trimmed;
  };

  /**
   * 解析 Markdown 为树形结构
   */
  MindmapRenderer.prototype.parse = function(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return null;
    }

    var lines = markdown.split('\n');
    var root = null;
    var stack = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      
      if (!line.trim()) {
        continue;
      }

      var level = this.getIndentLevel(line);
      var text = this.extractText(line);

      if (!text) {
        continue;
      }

      var node = {
        text: text,
        level: level,
        children: [],
        colorIndex: -1
      };

      if (level === 0) {
        root = node;
        stack = [root];
      } else {
        while (stack.length > level) {
          stack.pop();
        }
        
        if (stack.length > 0) {
          var parent = stack[stack.length - 1];
          
          if (level === 1) {
            node.colorIndex = parent.children.length % this.colors.length;
          } else if (parent.colorIndex !== -1) {
            node.colorIndex = parent.colorIndex;
          }
          
          parent.children.push(node);
          stack.push(node);
        }
      }
    }

    return root;
  };

  /**
   * 创建节点 DOM 元素
   */
  MindmapRenderer.prototype.createNode = function(node, level, isLast, isOnly) {
    var self = this;
    var wrapper = document.createElement('div');
    wrapper.className = 'mindmap-node-wrapper';
    
    if (isLast) {
      wrapper.className += ' last-child';
    }
    
    if (isOnly) {
      wrapper.className += ' only-child';
    }

    var nodeEl = document.createElement('div');
    nodeEl.className = 'mindmap-node level-' + level;
    
    if (level === 0) {
      nodeEl.className += ' root-node';
    } else if (level === 1) {
      nodeEl.className += ' branch-node';
    } else {
      nodeEl.className += ' leaf-node';
    }

    if (node.colorIndex !== -1) {
      nodeEl.setAttribute('data-color-index', node.colorIndex);
    }

    var textSpan = document.createElement('span');
    textSpan.className = 'mindmap-text';
    textSpan.textContent = node.text;
    nodeEl.appendChild(textSpan);

    if (node.children.length > 0) {
      var expandBtn = document.createElement('span');
      expandBtn.className = 'expand-btn';
      expandBtn.textContent = '−';
      nodeEl.insertBefore(expandBtn, textSpan);

      expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var childrenContainer = wrapper.querySelector('.mindmap-children');
        if (childrenContainer) {
          var isCollapsed = childrenContainer.style.display === 'none';
          childrenContainer.style.display = isCollapsed ? 'block' : 'none';
          expandBtn.textContent = isCollapsed ? '−' : '+';
          wrapper.className = isCollapsed 
            ? wrapper.className.replace(' collapsed', '')
            : wrapper.className + ' collapsed';
        }
      });
    }

    wrapper.appendChild(nodeEl);

    if (node.children.length > 0) {
      var childContainer = document.createElement('div');
      childContainer.className = 'mindmap-children';
      
      if (node.children.length === 1) {
        childContainer.className += ' single-child';
      }

      for (var i = 0; i < node.children.length; i++) {
        var isLastChild = i === node.children.length - 1;
        var isOnlyChild = node.children.length === 1;
        var childEl = this.createNode(node.children[i], level + 1, isLastChild, isOnlyChild);
        childContainer.appendChild(childEl);
      }

      wrapper.appendChild(childContainer);
    }

    return wrapper;
  };

  /**
   * 渲染思维导图
   */
  MindmapRenderer.prototype.render = function(markdown) {
    if (!this.container) {
      console.error('容器不存在');
      return;
    }

    this.container.innerHTML = '';

    var data = this.parse(markdown);
    
    if (!data) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'mindmap-empty';
      emptyDiv.textContent = '暂无思维导图内容';
      this.container.appendChild(emptyDiv);
      return;
    }

    var rootEl = this.createNode(data, 0, false);
    this.container.appendChild(rootEl);
  };

  /**
   * 导出为图片（简化版，仅支持基础截图）
   */
  MindmapRenderer.prototype.exportImage = function() {
    alert('miniblink 环境下建议使用窗口截图功能导出图片');
  };

  window.MindmapRenderer = MindmapRenderer;

})(window);
