"""
思维导图渲染服务 - 将 Markdown 格式的思维导图转换为图片
使用 matplotlib 绘制，兼容 miniblink 等轻量级浏览器
"""

import os
import re
from typing import List, Tuple, Dict
from io import BytesIO
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.path import Path
import matplotlib.patheffects as path_effects


class MindmapNode:
    """思维导图节点"""
    def __init__(self, text: str, level: int):
        self.text = text
        self.level = level
        self.children: List[MindmapNode] = []
        self.x = 0
        self.y = 0
        self.width = 0
        self.height = 0


class MindmapRenderer:
    """思维导图渲染器"""
    
    def __init__(self):
        self.colors = [
            '#FF6B6B',  # 红色
            '#4ECDC4',  # 青色
            '#45B7D1',  # 蓝色
            '#FFA07A',  # 橙色
            '#98D8C8',  # 绿色
            '#F7DC6F',  # 黄色
            '#BB8FCE',  # 紫色
            '#85C1E2',  # 浅蓝
        ]
        self.node_height = 0.8
        self.node_padding = 0.3
        self.level_spacing = 4.0
        self.vertical_spacing = 1.2
        
    def parse_markdown(self, markdown_text: str) -> MindmapNode:
        """解析 Markdown 格式的思维导图"""
        lines = markdown_text.strip().split('\n')
        root = None
        stack = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            match = re.match(r'^(#{1,4})\s+(.+)$', line)
            if not match:
                continue
                
            level = len(match.group(1))
            text = match.group(2).strip()
            
            node = MindmapNode(text, level)
            
            if level == 1:
                root = node
                stack = [node]
            else:
                while len(stack) >= level:
                    stack.pop()
                
                if stack:
                    parent = stack[-1]
                    parent.children.append(node)
                    stack.append(node)
        
        return root
    
    def calculate_tree_size(self, node: MindmapNode) -> float:
        """计算子树高度"""
        if not node.children:
            return 1.0
        
        total_height = 0
        for child in node.children:
            total_height += self.calculate_tree_size(child)
        
        return max(1.0, total_height)
    
    def layout_tree(self, node: MindmapNode, x: float, y: float, available_height: float):
        """递归布局树形结构"""
        node.x = x
        node.y = y
        
        if not node.children:
            return
        
        total_height = sum(self.calculate_tree_size(child) for child in node.children)
        
        current_y = y + (available_height - total_height * self.vertical_spacing) / 2
        
        for child in node.children:
            child_height = self.calculate_tree_size(child)
            child_space = child_height * self.vertical_spacing
            
            child_y = current_y + child_space / 2
            self.layout_tree(child, x + self.level_spacing, child_y, child_space)
            
            current_y += child_space
    
    def draw_node(self, ax, node: MindmapNode, color: str, is_root: bool = False):
        """绘制单个节点"""
        text_obj = ax.text(node.x, node.y, '', fontsize=1, alpha=0)
        bbox = text_obj.get_window_extent(renderer=ax.figure.canvas.get_renderer())
        bbox = bbox.transformed(ax.transData.inverted())
        
        font_size = 14 if is_root else 12 if node.level == 2 else 10
        
        text_width = len(node.text) * font_size * 0.08
        text_height = self.node_height
        
        padding = 0.4 if is_root else 0.3
        box_width = text_width + padding * 2
        box_height = text_height + padding
        
        x_offset = box_width / 2
        y_offset = box_height / 2
        
        if is_root:
            fancy_box = FancyBboxPatch(
                (node.x - x_offset, node.y - y_offset),
                box_width, box_height,
                boxstyle="round,pad=0.1",
                facecolor=color,
                edgecolor='white',
                linewidth=2,
                alpha=0.9
            )
        else:
            fancy_box = FancyBboxPatch(
                (node.x - x_offset, node.y - y_offset),
                box_width, box_height,
                boxstyle="round,pad=0.05",
                facecolor=color,
                edgecolor=color,
                linewidth=1.5,
                alpha=0.85
            )
        
        ax.add_patch(fancy_box)
        
        text = ax.text(
            node.x, node.y, node.text,
            fontsize=font_size,
            ha='center', va='center',
            color='white' if is_root or node.level == 2 else '#333',
            weight='bold' if is_root else 'normal',
            fontfamily='Microsoft YaHei, SimHei, sans-serif',
            zorder=10
        )
        
        text.set_path_effects([
            path_effects.Stroke(linewidth=0.5, foreground='rgba(0,0,0,0.1)'),
            path_effects.Normal()
        ])
        
        node.width = box_width
        node.height = box_height
    
    def draw_connection(self, ax, parent: MindmapNode, child: MindmapNode, color: str):
        """绘制连接线"""
        start_x = parent.x + parent.width / 2
        start_y = parent.y
        end_x = child.x - child.width / 2
        end_y = child.y
        
        mid_x = (start_x + end_x) / 2
        
        path_data = [
            (Path.MOVETO, (start_x, start_y)),
            (Path.CURVE4, (mid_x, start_y)),
            (Path.CURVE4, (mid_x, end_y)),
            (Path.CURVE4, (end_x, end_y)),
        ]
        
        codes, verts = zip(*path_data)
        path = Path(verts, codes)
        patch = patches.PathPatch(
            path,
            facecolor='none',
            edgecolor=color,
            linewidth=2,
            alpha=0.6,
            zorder=1
        )
        ax.add_patch(patch)
    
    def render_tree(self, ax, node: MindmapNode, parent_color: str = None, is_root: bool = False):
        """递归渲染整棵树"""
        if is_root:
            color = '#5B7C99'
        elif node.level == 2:
            color = self.colors[(hash(node.text) % len(self.colors))]
        else:
            color = parent_color if parent_color else self.colors[0]
        
        lighter_color = self.lighten_color(color, 0.3) if node.level > 2 else color
        
        self.draw_node(ax, node, lighter_color, is_root)
        
        for child in node.children:
            self.draw_connection(ax, node, child, color)
            self.render_tree(ax, child, color, False)
    
    def lighten_color(self, color: str, amount: float = 0.3) -> str:
        """使颜色变浅"""
        import matplotlib.colors as mcolors
        try:
            c = mcolors.hex2color(color)
            c = tuple(min(1, x + amount) for x in c)
            return mcolors.rgb2hex(c)
        except:
            return color
    
    def render_to_file(self, markdown_text: str, output_path: str, dpi: int = 150):
        """渲染思维导图并保存为图片"""
        root = self.parse_markdown(markdown_text)
        
        if not root:
            raise ValueError("无法解析思维导图内容")
        
        tree_height = self.calculate_tree_size(root)
        
        fig_width = 16
        fig_height = max(10, tree_height * 1.5)
        
        plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
        plt.rcParams['axes.unicode_minus'] = False
        
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)
        ax.set_xlim(-1, 20)
        ax.set_ylim(-tree_height * self.vertical_spacing / 2 - 2, 
                    tree_height * self.vertical_spacing / 2 + 2)
        ax.axis('off')
        
        fig.patch.set_facecolor('white')
        ax.set_facecolor('white')
        
        self.layout_tree(root, 2, 0, tree_height * self.vertical_spacing)
        
        self.render_tree(ax, root, is_root=True)
        
        plt.tight_layout(pad=1)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        plt.savefig(output_path, dpi=dpi, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        plt.close()
        
        return output_path
    
    def render_to_bytes(self, markdown_text: str, dpi: int = 150) -> BytesIO:
        """渲染思维导图并返回字节流"""
        root = self.parse_markdown(markdown_text)
        
        if not root:
            raise ValueError("无法解析思维导图内容")
        
        tree_height = self.calculate_tree_size(root)
        
        fig_width = 16
        fig_height = max(10, tree_height * 1.5)
        
        plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
        plt.rcParams['axes.unicode_minus'] = False
        
        fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)
        ax.set_xlim(-1, 20)
        ax.set_ylim(-tree_height * self.vertical_spacing / 2 - 2, 
                    tree_height * self.vertical_spacing / 2 + 2)
        ax.axis('off')
        
        fig.patch.set_facecolor('white')
        ax.set_facecolor('white')
        
        self.layout_tree(root, 2, 0, tree_height * self.vertical_spacing)
        
        self.render_tree(ax, root, is_root=True)
        
        plt.tight_layout(pad=1)
        
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=dpi, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        buf.seek(0)
        plt.close()
        
        return buf
