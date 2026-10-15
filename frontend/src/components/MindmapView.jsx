import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap, loadCSS, loadJS } from 'markmap-view'
import { ChevronLeft, ChevronRight, Plus, Minus, Download, Maximize2, X } from 'lucide-react'

const transformer = new Transformer()

function MindmapView({ content, isFullscreen = false, onToggleFullscreen }) {
  const svgRef = useRef(null)
  const markmapRef = useRef(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const createMarkmap = useCallback((svgElement) => {
    if (!content || !svgElement) return null

    svgElement.innerHTML = ''

    try {
      const { root, features } = transformer.transform(content)
      
      const { styles, scripts } = transformer.getUsedAssets(features)
      if (styles) loadCSS(styles)
      if (scripts) loadJS(scripts, { getMarkmap: () => ({ Markmap }) })
      
      const mm = Markmap.create(svgElement, {
        autoFit: true,
        duration: 500,
        maxWidth: 300,
        colorFreezeLevel: 2,
      }, root)
      
      setTimeout(() => {
        if (mm) mm.fit()
      }, 100)

      return mm
    } catch (error) {
      console.error('思维导图渲染失败:', error)
      return null
    }
  }, [content])

  useEffect(() => {
    markmapRef.current = createMarkmap(svgRef.current)
    return () => {
      if (markmapRef.current) markmapRef.current = null
    }
  }, [content, createMarkmap, isFullscreen])

  // 展开/收起所有节点
  const toggleExpand = () => {
    const mm = markmapRef.current
    if (!mm) return

    const { root } = transformer.transform(content)
    
    const setExpanded = (node, expanded) => {
      if (node.children) {
        node.payload = { ...node.payload, fold: expanded ? 0 : 1 }
        node.children.forEach(child => setExpanded(child, expanded))
      }
    }
    
    setExpanded(root, !isExpanded)
    mm.setData(root)
    mm.fit()
    setIsExpanded(!isExpanded)
  }

  // 放大
  const zoomIn = () => {
    const mm = markmapRef.current
    if (mm) mm.rescale(1.25)
  }

  // 缩小
  const zoomOut = () => {
    const mm = markmapRef.current
    if (mm) mm.rescale(0.8)
  }

  // 下载 PNG
  const downloadPng = async () => {
    const svgElement = svgRef.current
    if (!svgElement) return

    try {
      // 获取 SVG 的实际尺寸
      const bbox = svgElement.getBBox()
      const width = Math.max(bbox.width + 100, svgElement.clientWidth)
      const height = Math.max(bbox.height + 100, svgElement.clientHeight)
      
      // 克隆 SVG 并添加样式
      const clonedSvg = svgElement.cloneNode(true)
      clonedSvg.setAttribute('width', width)
      clonedSvg.setAttribute('height', height)
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      
      const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style')
      styleElement.textContent = `
        .markmap-node-circle { fill: #fff; stroke-width: 1.5px; }
        .markmap-node-text { fill: #333; font-size: 14px; font-family: sans-serif; }
        .markmap-link { fill: none; stroke-width: 2px; }
      `
      clonedSvg.insertBefore(styleElement, clonedSvg.firstChild)
      
      // 设置背景
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('width', '100%')
      rect.setAttribute('height', '100%')
      rect.setAttribute('fill', '#ffffff')
      clonedSvg.insertBefore(rect, clonedSvg.firstChild)

      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
      const imgSrc = `data:image/svg+xml;base64,${svgBase64}`
      
      // 创建 canvas 转换为 PNG
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = 2  // 高清
        canvas.width = width * scale
        canvas.height = height * scale
        
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0, width, height)

        // 下载 PNG
        const link = document.createElement('a')
        link.download = '思维导图.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = imgSrc
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请重试')
    }
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        暂无思维导图内容
      </div>
    )
  }

  // 控制按钮组件
  const ControlButtons = ({ position = 'left' }) => (
    <div className={`absolute ${position === 'left' ? 'left-3' : 'right-3'} top-3 flex flex-col gap-2 z-10`}>
      {/* 展开/收起 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={toggleExpand}
          className="w-full p-2 hover:bg-gray-100 transition-colors flex items-center justify-center"
          title={isExpanded ? '收起所有' : '展开所有'}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* 放大/缩小 */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={zoomIn}
          className="p-2 hover:bg-gray-100 transition-colors border-b border-gray-200"
          title="放大"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-gray-100 transition-colors"
          title="缩小"
        >
          <Minus className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  )

  // 右上角按钮
  const TopRightButtons = () => (
    <div className="absolute right-3 top-3 flex gap-2 z-10">
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
          title={isFullscreen ? "退出全屏" : "放大"}
        >
          {isFullscreen ? <X className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
        </button>
      )}
      <button
        onClick={downloadPng}
        className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
        title="下载"
      >
        <Download className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  )

  return (
    <div className="w-full h-full bg-white overflow-hidden relative">
      {/* 左侧控制按钮 - 全屏时在右下角 */}
      <div className={`absolute ${isFullscreen ? 'right-4 bottom-4' : 'left-3 top-3'} flex flex-col gap-2 z-10`}>
        {/* 展开/收起 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={toggleExpand}
            className="w-full p-2 hover:bg-gray-100 transition-colors flex items-center justify-center"
            title={isExpanded ? '收起所有' : '展开所有'}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* 放大/缩小 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={zoomIn}
            className="p-2 hover:bg-gray-100 transition-colors border-b border-gray-200"
            title="放大"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 hover:bg-gray-100 transition-colors"
            title="缩小"
          >
            <Minus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <TopRightButtons />
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      <style>{`
        .markmap-node-circle {
          fill: #fff;
          stroke-width: 1.5px;
        }
        .markmap-node-text {
          fill: #333;
          font-size: 14px;
        }
        .markmap-link {
          fill: none;
          stroke-width: 2px;
        }
      `}</style>
    </div>
  )
}

export default MindmapView
