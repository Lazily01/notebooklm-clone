import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Download, Code, Eye } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

// 风格配置 - 参考 LandPPT 的设计
const styleConfig = {
  business: {
    colorScheme: '#1F4E79',
    bgGradient: 'linear-gradient(135deg, #1F4E7922, #1F4E7911)',
    titleColor: '#1F4E79',
    textColor: '#333',
    fontFamily: 'Calibri, sans-serif'
  },
  tech: {
    colorScheme: '#9B59B6',
    bgGradient: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
    titleColor: '#22d3ee',
    textColor: '#e2e8f0',
    fontFamily: 'Roboto, sans-serif'
  },
  academic: {
    colorScheme: '#8B4513',
    bgGradient: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
    titleColor: '#78350f',
    textColor: '#451a03',
    fontFamily: 'Times New Roman, serif'
  },
  creative: {
    colorScheme: '#E74C3C',
    bgGradient: 'linear-gradient(135deg, #fce7f3, #e9d5ff)',
    titleColor: '#be185d',
    textColor: '#4a044e',
    fontFamily: 'Comic Sans MS, cursive'
  },
  minimal: {
    colorScheme: '#34495E',
    bgGradient: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
    titleColor: '#1f2937',
    textColor: '#4b5563',
    fontFamily: 'Helvetica, sans-serif'
  }
}

const SlidesView = ({ slides, title, style = 'business', docId, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [viewMode, setViewMode] = useState('preview') // preview | html

  const config = styleConfig[style] || styleConfig.business

  // 生成单页幻灯片的 HTML
  const generateSlideHTML = (slide, index) => {
    const isTitle = index === 0
    const isThanks = index === slides.length - 1 && slide.title?.includes('谢')
    
    if (isTitle) {
      return `
        <div class="slide title-slide" style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: ${config.bgGradient};
          font-family: ${config.fontFamily};
        ">
          <h1 style="color: ${config.titleColor}; font-size: 3.5em; margin-bottom: 30px;">${slide.title}</h1>
          ${slide.points?.[0] ? `<h3 style="color: ${config.textColor}; font-size: 1.5em; font-style: italic;">${slide.points[0]}</h3>` : ''}
        </div>
      `
    }
    
    if (isThanks) {
      return `
        <div class="slide thankyou-slide" style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: ${config.bgGradient};
          font-family: ${config.fontFamily};
        ">
          <h1 style="color: ${config.titleColor}; font-size: 3.5em;">${slide.title}</h1>
          <h3 style="color: ${config.textColor}; font-size: 1.5em; margin-top: 20px;">感谢聆听</h3>
        </div>
      `
    }
    
    const pointsHTML = slide.points?.map(point => 
      `<li style="padding: 12px 0; font-size: 1.3em; color: ${config.textColor}; border-bottom: 1px solid #eee;">• ${point}</li>`
    ).join('') || ''
    
    return `
      <div class="slide content-slide" style="
        padding: 60px 80px;
        background: white;
        font-family: ${config.fontFamily};
      ">
        <h2 style="
          color: ${config.titleColor}; 
          font-size: 2.2em; 
          margin-bottom: 30px;
          border-bottom: 3px solid ${config.colorScheme};
          padding-bottom: 15px;
        ">${slide.title}</h2>
        <ul style="list-style: none; padding: 0; margin-top: 20px;">
          ${pointsHTML}
        </ul>
      </div>
    `
  }

  // 生成完整的 HTML 文档
  const generateFullHTML = () => {
    const slidesHTML = slides.map((slide, i) => generateSlideHTML(slide, i)).join('\n')
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${config.fontFamily};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .presentation-container {
      width: 1280px;
      height: 720px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .slides-wrapper {
      position: relative;
      width: 100%;
      height: calc(100% - 60px);
      overflow: hidden;
    }
    .slide {
      display: none;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    .slide.active { display: flex; }
    .navigation {
      background: ${config.colorScheme};
      padding: 15px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }
    .navigation button {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 1em;
    }
    .navigation button:hover { background: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div class="presentation-container">
    <div class="slides-wrapper">
      ${slidesHTML}
    </div>
    <div class="navigation">
      <button onclick="changeSlide(-1)">‹ 上一页</button>
      <span id="counter">1 / ${slides.length}</span>
      <button onclick="changeSlide(1)">下一页 ›</button>
    </div>
  </div>
  <script>
    let current = 0;
    const total = ${slides.length};
    const allSlides = document.querySelectorAll('.slide');
    
    function showSlide(n) {
      if (n >= total) current = 0;
      if (n < 0) current = total - 1;
      allSlides.forEach(s => s.classList.remove('active'));
      allSlides[current].classList.add('active');
      document.getElementById('counter').textContent = (current + 1) + ' / ' + total;
    }
    
    function changeSlide(n) {
      current += n;
      showSlide(current);
    }
    
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') changeSlide(-1);
      if (e.key === 'ArrowRight' || e.key === ' ') changeSlide(1);
    });
    
    showSlide(0);
  </script>
</body>
</html>`
  }

  // 键盘导航
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      setCurrentIndex(prev => Math.min(prev + 1, slides.length - 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setCurrentIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Escape') {
      if (isFullscreen) {
        setIsFullscreen(false)
      } else {
        onClose()
      }
    } else if (e.key === 'f' || e.key === 'F') {
      setIsFullscreen(prev => !prev)
    }
  }, [slides.length, isFullscreen, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 下载 PPT
  const handleDownload = async () => {
    if (!docId) return
    
    setIsDownloading(true)
    try {
      const response = await axios.post(
        `${API_BASE}/slides/${docId}/download`,
        { slides },
        { 
          params: { style },
          responseType: 'blob' 
        }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${title || '幻灯片'}.pptx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请重试')
    } finally {
      setIsDownloading(false)
    }
  }

  // 下载 HTML
  const handleDownloadHTML = () => {
    const html = generateFullHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${title || '幻灯片'}.html`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  // 在新窗口打开 HTML 预览
  const handleOpenHTML = () => {
    const html = generateFullHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const currentSlide = slides[currentIndex]
  const isTitle = currentIndex === 0
  const isThanks = currentIndex === slides.length - 1 && currentSlide?.title?.includes('谢')

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isFullscreen ? 'bg-black' : 'bg-black/80'}`}>
      {/* 顶部工具栏 */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-6 py-3 bg-black/50">
          <h2 className="text-white font-medium">{title}</h2>
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex bg-white/10 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'preview' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('html')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'html' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleOpenHTML}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              HTML预览
            </button>
            <button
              onClick={handleDownloadHTML}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Code className="w-4 h-4" />
              下载HTML
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? '下载中...' : '下载PPT'}
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 幻灯片区域 */}
      <div className="flex-1 flex items-center justify-center p-8">
        {viewMode === 'preview' ? (
          <div 
            className="relative w-full max-w-5xl aspect-video rounded-lg shadow-2xl overflow-hidden"
            style={{ 
              background: (isTitle || isThanks) ? config.bgGradient : 'white',
              fontFamily: config.fontFamily
            }}
          >
            {/* 幻灯片内容 */}
            <div className={`absolute inset-0 p-12 flex flex-col ${(isTitle || isThanks) ? 'items-center justify-center text-center' : ''}`}>
              {/* 标题 */}
              <h1 
                className="font-bold mb-8"
                style={{ 
                  color: config.titleColor,
                  fontSize: (isTitle || isThanks) ? '3.5rem' : '2.5rem',
                  borderBottom: (!isTitle && !isThanks) ? `3px solid ${config.colorScheme}` : 'none',
                  paddingBottom: (!isTitle && !isThanks) ? '15px' : '0'
                }}
              >
                {currentSlide?.title}
              </h1>
            
              {/* 要点 */}
              {!isTitle && !isThanks && (
                <div className="flex-1 space-y-3 mt-4">
                  {currentSlide?.points?.map((point, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-4 py-3"
                      style={{ borderBottom: '1px solid #eee' }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                        style={{ background: config.colorScheme }}
                      />
                      <p className="text-xl" style={{ color: config.textColor }}>{point}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 封面副标题 */}
              {isTitle && currentSlide?.points?.[0] && (
                <p className="text-xl mt-4" style={{ color: config.textColor, fontStyle: 'italic' }}>
                  {currentSlide.points[0]}
                </p>
              )}

              {/* 页码 */}
              <div 
                className="text-sm opacity-60 text-right mt-auto"
                style={{ color: config.textColor }}
              >
                {currentIndex + 1} / {slides.length}
              </div>
            </div>

            {/* 导航按钮 */}
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentIndex < slides.length - 1 && (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        ) : (
          /* HTML 代码视图 */
          <div className="w-full max-w-5xl h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-4 py-2 text-gray-400 text-sm flex items-center justify-between">
              <span>HTML 源代码</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateFullHTML())
                  alert('已复制到剪贴板')
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
              >
                复制代码
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-green-400 text-sm font-mono">
              <code>{generateFullHTML()}</code>
            </pre>
          </div>
        )}
      </div>

      {/* 全屏时的退出按钮 */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      {/* 底部缩略图 */}
      {!isFullscreen && viewMode === 'preview' && (
        <div className="px-6 py-4 bg-black/50 overflow-x-auto">
          <div className="flex gap-2 justify-center">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex-shrink-0 w-24 h-14 rounded overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-white scale-110' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <div 
                  className="w-full h-full p-1"
                  style={{ background: idx === 0 ? config.bgGradient : 'white' }}
                >
                  <div 
                    className="text-[6px] font-bold truncate"
                    style={{ color: config.titleColor }}
                  >
                    {slide.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 键盘提示 */}
      {!isFullscreen && viewMode === 'preview' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs">
          ← → 切换 | 空格 下一页 | F 全屏 | ESC 退出
        </div>
      )}
    </div>
  )
}

export default SlidesView
