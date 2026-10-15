import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// 设置 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function PdfViewer({ url, initialPage = 1, onPageChange }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)

  // 加载 PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true)
        const loadingTask = pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setLoading(false)
      } catch (error) {
        console.error('PDF 加载失败:', error)
        setLoading(false)
      }
    }
    loadPdf()
  }, [url])

  // 渲染页面
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return

      try {
        const page = await pdfDoc.getPage(currentPage)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        // 计算适应容器宽度的缩放比例
        const containerWidth = containerRef.current.clientWidth - 40 // 留一些边距
        const containerHeight = containerRef.current.clientHeight - 40
        const viewport = page.getViewport({ scale: 1 })
        
        // 选择宽度或高度适应，取较小值
        const scaleX = containerWidth / viewport.width
        const scaleY = containerHeight / viewport.height
        const fitScale = Math.min(scaleX, scaleY)
        const finalScale = fitScale * scale
        
        const scaledViewport = page.getViewport({ scale: finalScale })
        
        // 使用设备像素比提高清晰度
        const pixelRatio = window.devicePixelRatio || 1
        const outputScale = pixelRatio * 2 // 2倍渲染提高清晰度
        
        canvas.width = Math.floor(scaledViewport.width * outputScale)
        canvas.height = Math.floor(scaledViewport.height * outputScale)
        canvas.style.width = `${Math.floor(scaledViewport.width)}px`
        canvas.style.height = `${Math.floor(scaledViewport.height)}px`
        
        const transform = [outputScale, 0, 0, outputScale, 0, 0]

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
          transform: transform
        }).promise
      } catch (error) {
        console.error('页面渲染失败:', error)
      }
    }
    renderPage()
  }, [pdfDoc, currentPage, scale])

  // 当 initialPage 变化时更新当前页
  useEffect(() => {
    if (initialPage && initialPage !== currentPage) {
      setCurrentPage(initialPage)
    }
  }, [initialPage])

  // 页面变化时通知父组件
  useEffect(() => {
    onPageChange?.(currentPage)
  }, [currentPage, onPageChange])

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3))
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 text-white text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-1 py-0.5 text-center bg-gray-700 rounded text-white"
              min={1}
              max={totalPages}
            />
            <span className="mx-1">/</span>
            <span>{totalPages}</span>
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="p-1 hover:bg-gray-700 rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1 hover:bg-gray-700 rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* PDF 内容 */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-5"
      >
        <canvas ref={canvasRef} className="shadow-lg bg-white" />
      </div>
    </div>
  )
}

export default PdfViewer
