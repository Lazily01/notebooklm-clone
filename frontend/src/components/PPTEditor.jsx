import React, { useState, useEffect } from 'react'
import { 
  X, ChevronLeft, ChevronRight, Plus, Trash2, Edit3, Save, 
  Play, Download, RefreshCw, Eye, Code, Maximize2, GripVertical,
  FileText, Users, Palette, Loader2
} from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

// 场景配置
const SCENARIOS = [
  { id: 'general', name: '通用演示', icon: '📊', color: '#2E86AB' },
  { id: 'business', name: '商务汇报', icon: '💼', color: '#1F4E79' },
  { id: 'technology', name: '科技展示', icon: '🚀', color: '#9B59B6' },
  { id: 'education', name: '教育培训', icon: '📚', color: '#E74C3C' },
  { id: 'academic', name: '学术报告', icon: '🎓', color: '#8B4513' }
]

const PPTEditor = ({ docId, docName, onClose }) => {
  // 状态
  const [step, setStep] = useState('config') // config -> outline -> preview
  const [scenario, setScenario] = useState('general')
  const [pageCount, setPageCount] = useState(10)
  const [targetAudience, setTargetAudience] = useState('普通大众')
  
  const [projectId, setProjectId] = useState(null)
  const [outline, setOutline] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  
  const [editingSlide, setEditingSlide] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // 创建项目并生成大纲
  const handleGenerateOutline = async () => {
    setIsLoading(true)
    setLoadingText('正在创建项目...')
    
    try {
      // 1. 创建项目
      const createRes = await axios.post(`${API_BASE}/ppt/projects/${docId}`, {
        scenario
      })
      const { project_id } = createRes.data
      setProjectId(project_id)
      
      // 2. 生成大纲
      setLoadingText('正在生成大纲...')
      const outlineRes = await axios.post(`${API_BASE}/ppt/projects/${project_id}/outline`, {
        page_count: pageCount,
        target_audience: targetAudience,
        ppt_style: scenario
      })
      
      setOutline(outlineRes.data.outline)
      setStep('outline')
      
    } catch (error) {
      console.error('生成大纲失败:', error)
      alert('生成大纲失败，请重试')
    } finally {
      setIsLoading(false)
      setLoadingText('')
    }
  }

  // 更新大纲
  const handleUpdateOutline = async () => {
    if (!projectId || !outline) return
    
    try {
      await axios.put(`${API_BASE}/ppt/projects/${projectId}/outline`, {
        outline
      })
    } catch (error) {
      console.error('保存大纲失败:', error)
    }
  }

  // 生成详细内容
  const handleGenerateContent = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    setLoadingText('正在生成幻灯片内容...')
    
    try {
      const res = await axios.post(`${API_BASE}/ppt/projects/${projectId}/generate-content`)
      setOutline(prev => ({
        ...prev,
        slides: res.data.slides
      }))
    } catch (error) {
      console.error('生成内容失败:', error)
      alert('生成内容失败，请重试')
    } finally {
      setIsLoading(false)
      setLoadingText('')
    }
  }

  // 预览 HTML
  const handlePreview = async () => {
    if (!projectId) return
    
    // 先保存大纲
    await handleUpdateOutline()
    
    // 获取 HTML
    try {
      const res = await axios.get(`${API_BASE}/ppt/projects/${projectId}/html`)
      setPreviewHtml(res.data)
      setStep('preview')
    } catch (error) {
      console.error('获取预览失败:', error)
    }
  }

  // 在新窗口打开预览
  const handleOpenPreview = () => {
    if (!previewHtml) return
    const blob = new Blob([previewHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  // 下载 HTML
  const handleDownloadHTML = () => {
    if (!previewHtml) return
    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${outline?.title || '幻灯片'}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 添加幻灯片
  const handleAddSlide = (afterIndex) => {
    if (!outline) return
    
    const newSlide = {
      page_number: afterIndex + 2,
      title: '新页面',
      content_points: ['要点1', '要点2', '要点3'],
      slide_type: 'content'
    }
    
    const newSlides = [...outline.slides]
    newSlides.splice(afterIndex + 1, 0, newSlide)
    
    // 重新编号
    newSlides.forEach((s, i) => s.page_number = i + 1)
    
    setOutline({
      ...outline,
      slides: newSlides,
      metadata: { ...outline.metadata, total_slides: newSlides.length }
    })
  }

  // 删除幻灯片
  const handleDeleteSlide = (index) => {
    if (!outline || outline.slides.length <= 3) return
    
    const newSlides = outline.slides.filter((_, i) => i !== index)
    newSlides.forEach((s, i) => s.page_number = i + 1)
    
    setOutline({
      ...outline,
      slides: newSlides,
      metadata: { ...outline.metadata, total_slides: newSlides.length }
    })
  }

  // 更新幻灯片
  const handleUpdateSlide = (index, field, value) => {
    if (!outline) return
    
    const newSlides = [...outline.slides]
    if (field === 'content_points') {
      newSlides[index].content_points = value.split('\n').filter(p => p.trim())
    } else {
      newSlides[index][field] = value
    }
    
    setOutline({ ...outline, slides: newSlides })
  }

  // 渲染配置步骤
  const renderConfigStep = () => (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">创建演示文稿</h2>
      
      {/* 场景选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Palette className="w-4 h-4 inline mr-2" />
          选择场景
        </label>
        <div className="grid grid-cols-5 gap-3">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                scenario === s.id 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-sm font-medium">{s.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 页数设置 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <FileText className="w-4 h-4 inline mr-2" />
          幻灯片页数: {pageCount} 页
        </label>
        <input
          type="range"
          min="5"
          max="20"
          value={pageCount}
          onChange={(e) => setPageCount(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5页</span>
          <span>20页</span>
        </div>
      </div>

      {/* 目标受众 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Users className="w-4 h-4 inline mr-2" />
          目标受众
        </label>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="例如：企业管理层、技术开发者、学生..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* 文档信息 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="text-sm text-gray-600">
          <span className="font-medium">基于文档：</span> {docName}
        </div>
      </div>
    </div>
  )

  // 渲染大纲编辑步骤
  const renderOutlineStep = () => (
    <div className="flex-1 flex overflow-hidden">
      {/* 左侧：幻灯片列表 */}
      <div className="w-64 bg-gray-50 border-r overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700">幻灯片</h3>
          <span className="text-sm text-gray-500">{outline?.slides?.length || 0} 页</span>
        </div>
        
        <div className="space-y-2">
          {outline?.slides?.map((slide, index) => (
            <div
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                currentSlideIndex === index 
                  ? 'bg-indigo-100 border-2 border-indigo-500' 
                  : 'bg-white border border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{index + 1}</span>
                <span className="text-sm font-medium truncate flex-1">{slide.title}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 truncate">
                {slide.content_points?.slice(0, 2).join(', ')}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => handleAddSlide(outline?.slides?.length - 1 || 0)}
          className="w-full mt-4 p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加页面
        </button>
      </div>

      {/* 右侧：编辑区域 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {outline?.slides?.[currentSlideIndex] && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                第 {currentSlideIndex + 1} 页
              </h3>
              {outline.slides.length > 3 && (
                <button
                  onClick={() => handleDeleteSlide(currentSlideIndex)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 标题编辑 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
              <input
                type="text"
                value={outline.slides[currentSlideIndex].title}
                onChange={(e) => handleUpdateSlide(currentSlideIndex, 'title', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              />
            </div>

            {/* 类型选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">页面类型</label>
              <select
                value={outline.slides[currentSlideIndex].slide_type || 'content'}
                onChange={(e) => handleUpdateSlide(currentSlideIndex, 'slide_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="title">封面页</option>
                <option value="agenda">目录页</option>
                <option value="content">内容页</option>
                <option value="conclusion">结论页</option>
              </select>
            </div>

            {/* 要点编辑 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                内容要点（每行一个）
              </label>
              <textarea
                value={outline.slides[currentSlideIndex].content_points?.join('\n') || ''}
                onChange={(e) => handleUpdateSlide(currentSlideIndex, 'content_points', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="每行输入一个要点..."
              />
            </div>

            {/* 快速操作 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAddSlide(currentSlideIndex)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                <Plus className="w-4 h-4" />
                在后面添加页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 bg-gray-900 flex items-center justify-center p-8">
        <iframe
          srcDoc={previewHtml}
          className="w-full h-full max-w-5xl rounded-lg shadow-2xl"
          title="PPT Preview"
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* 顶部工具栏 */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <div className="text-lg font-medium">{outline?.title || docName}</div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm ${step === 'config' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>
            1. 配置
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`px-3 py-1 rounded-full text-sm ${step === 'outline' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>
            2. 大纲
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className={`px-3 py-1 rounded-full text-sm ${step === 'preview' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>
            3. 预览
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {step === 'outline' && (
            <>
              <button
                onClick={handleGenerateContent}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                丰富内容
              </button>
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                <Eye className="w-4 h-4" />
                预览
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('outline')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
                返回编辑
              </button>
              <button
                onClick={handleOpenPreview}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Maximize2 className="w-4 h-4" />
                全屏预览
              </button>
              <button
                onClick={handleDownloadHTML}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Download className="w-4 h-4" />
                下载 HTML
              </button>
            </>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <div className="text-lg text-gray-600">{loadingText}</div>
        </div>
      ) : (
        <>
          {step === 'config' && renderConfigStep()}
          {step === 'outline' && renderOutlineStep()}
          {step === 'preview' && renderPreviewStep()}
        </>
      )}

      {/* 底部操作栏 */}
      {step === 'config' && !isLoading && (
        <div className="h-16 border-t flex items-center justify-end px-6 bg-white">
          <button
            onClick={handleGenerateOutline}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Play className="w-4 h-4" />
            生成大纲
          </button>
        </div>
      )}
    </div>
  )
}

export default PPTEditor
