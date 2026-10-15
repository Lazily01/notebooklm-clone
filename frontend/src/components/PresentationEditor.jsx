import React, { useState, useEffect } from 'react'
import { 
  X, ChevronLeft, ChevronRight, Plus, Trash2, Edit3, Save, 
  Play, Download, RefreshCw, Eye, Maximize2, GripVertical,
  FileText, Users, Palette, Loader2, Check, Sparkles, Image
} from 'lucide-react'
import axios from 'axios'
import { useToast } from './Toast'

const API_BASE = 'http://localhost:8000'

// 主题配置
const THEMES = [
  { id: 'daktilo', name: 'Daktilo', description: '现代简洁', color: '#3B82F6' },
  { id: 'cornflower', name: 'Cornflower', description: '专业大气', color: '#4F46E5' },
  { id: 'mystique', name: 'Mystique', description: '深邃神秘', color: '#7C3AED' },
  { id: 'sunset', name: 'Sunset', description: '温暖活力', color: '#EA580C' },
  { id: 'forest', name: 'Forest', description: '自然清新', color: '#059669' }
]

// 图片来源配置
const IMAGE_SOURCES = [
  { id: 'pexels', name: 'Pexels', description: '搜索真实图片作为配图', icon: '🖼️' },
  { id: 'ai', name: 'AI 生成', description: 'AI 直接生成完整幻灯片', icon: '🤖' }
]

const PresentationEditor = ({ docId, docName, onClose, onStartGenerating, existingProjectId }) => {
  const toast = useToast()
  
  // 状态
  const [step, setStep] = useState('config') // config -> outline -> generating -> preview
  const [theme, setTheme] = useState('daktilo')
  const [imageSource, setImageSource] = useState('pexels')
  const [aiStyle, setAiStyle] = useState('') // AI 生成的自定义风格
  const [numSlides, setNumSlides] = useState(8)
  
  const [projectId, setProjectId] = useState(null)
  const [title, setTitle] = useState('')
  const [outline, setOutline] = useState([])
  const [slides, setSlides] = useState([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  const [editingIndex, setEditingIndex] = useState(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [generatedCount, setGeneratedCount] = useState(0)  // 已生成的幻灯片数量

  // 如果有已存在的项目ID，加载预览
  React.useEffect(() => {
    if (existingProjectId) {
      loadExistingProject(existingProjectId)
    }
  }, [existingProjectId])

  // 加载已有项目
  const loadExistingProject = async (projId) => {
    setIsLoading(true)
    setLoadingText('加载演示文稿...')
    
    try {
      // 获取项目详情（包含 slides 数据）
      const projectRes = await axios.get(`${API_BASE}/presentation/projects/${projId}`)
      setSlides(projectRes.data.slides || [])
      setTitle(projectRes.data.title || docName)
      
      // 获取 HTML 预览（用于非 AI 生成的幻灯片）
      const htmlRes = await axios.get(`${API_BASE}/presentation/projects/${projId}/html`)
      setPreviewHtml(htmlRes.data)
      setProjectId(projId)
      setCurrentSlideIndex(0)
      setStep('preview')
    } catch (error) {
      console.error('加载演示文稿失败:', error)
      toast.error('加载演示文稿失败')
    } finally {
      setIsLoading(false)
      setLoadingText('')
    }
  }

  // 创建项目并生成大纲
  const handleGenerateOutline = async () => {
    setIsLoading(true)
    setLoadingText('正在创建项目...')
    setLoadingProgress(10)
    
    try {
      // 1. 创建项目
      const createRes = await axios.post(`${API_BASE}/presentation/projects/${docId}`, {
        theme,
        image_source: imageSource,
        ai_style: imageSource === 'ai' ? (aiStyle || '商务简约') : ''
      })
      const { project_id } = createRes.data
      setProjectId(project_id)
      
      // 2. 生成大纲
      setLoadingText('AI 正在分析文档并生成大纲...')
      setLoadingProgress(30)
      
      const outlineRes = await axios.post(`${API_BASE}/presentation/projects/${project_id}/outline`, {
        num_slides: numSlides
      })
      
      setTitle(outlineRes.data.title)
      setOutline(outlineRes.data.outline)
      setEditingIndex(0)  // 默认选中第一个幻灯片
      setLoadingProgress(100)
      setStep('outline')
      
    } catch (error) {
      console.error('生成大纲失败:', error)
      toast.error('生成大纲失败，请重试')
    } finally {
      setIsLoading(false)
      setLoadingText('')
      setLoadingProgress(0)
    }
  }

  // 生成幻灯片
  const handleGenerateSlides = async () => {
    if (!projectId) return
    
    setIsLoading(true)
    setStep('generating')
    setLoadingText('AI 正在生成精美幻灯片...')
    setLoadingProgress(0)
    setGeneratedCount(0)
    
    // 通知父组件开始生成（在工作室显示进度），并传递生成所需的信息
    // 父组件会处理实际的生成逻辑
    onStartGenerating?.({ 
      docId, 
      docName, 
      title, 
      slideCount: outline.length, 
      projectId,
      outline 
    })
    
    // 自动关闭编辑器，让用户在工作室看到进度
    onClose?.()
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
    link.download = `${title || '演示文稿'}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 下载 - AI 生成的下载 PDF，Pexels 配图的下载 PPTX
  const handleDownload = async () => {
    if (!projectId) return
    
    // 判断是否是 AI 生成的幻灯片
    const isAiSlides = slides.length > 0 && slides[0]?.slide_image_url
    
    try {
      if (isAiSlides) {
        // AI 生成的幻灯片 - 下载 PDF
        const response = await axios.get(`${API_BASE}/presentation/projects/${projectId}/pdf`, {
          responseType: 'blob'
        })
        
        const blob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${title || '演示文稿'}.pdf`
        link.click()
        URL.revokeObjectURL(url)
      } else {
        // Pexels 配图的幻灯片 - 下载 PPTX
        const response = await axios.get(`${API_BASE}/presentation/projects/${projectId}/pptx`, {
          responseType: 'blob'
        })
        
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${title || '演示文稿'}.pptx`
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('下载失败:', error)
      toast.error('下载失败，请重试')
    }
  }

  // 更新大纲项
  const handleUpdateOutlineItem = (index, field, value) => {
    const newOutline = [...outline]
    if (field === 'points') {
      newOutline[index].points = value.split('\n').filter(p => p.trim())
    } else {
      newOutline[index][field] = value
    }
    setOutline(newOutline)
  }

  // 添加大纲项
  const handleAddOutlineItem = () => {
    setOutline([...outline, { title: '新主题', points: ['要点1', '要点2'] }])
  }

  // 删除大纲项
  const handleDeleteOutlineItem = (index) => {
    if (outline.length <= 2) return
    setOutline(outline.filter((_, i) => i !== index))
  }

  // 渲染配置步骤
  const renderConfigStep = () => (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">创建演示文稿</h2>
        <p className="text-gray-500 mb-8">基于您的文档，AI 将自动生成专业的演示文稿</p>
        
        {/* 主题选择 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Palette className="w-4 h-4 inline mr-2" />
            选择主题风格
          </label>
          <div className="grid grid-cols-5 gap-4">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                  theme === t.id 
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg' 
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow'
                }`}
              >
                {theme === t.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div 
                  className="w-10 h-10 rounded-lg mx-auto mb-3"
                  style={{ background: t.color }}
                />
                <div className="text-sm font-medium text-gray-800">{t.name}</div>
                <div className="text-xs text-gray-500 mt-1">{t.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 图片来源 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <Image className="w-4 h-4 inline mr-2" />
            图片来源
          </label>
          <div className="grid grid-cols-2 gap-4">
            {IMAGE_SOURCES.map(s => (
              <button
                key={s.id}
                onClick={() => setImageSource(s.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  imageSource === s.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                {imageSource === s.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* AI 风格输入框 - 仅在选择 AI 生成时显示 */}
          {imageSource === 'ai' && (
            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <label className="block text-sm font-medium text-purple-700 mb-2">
                🎨 自定义风格
              </label>
              <input
                type="text"
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value)}
                placeholder="例如：商务简约、科技感、可爱卡通、中国风水墨..."
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-purple-500 mt-2">
                AI 将根据你描述的风格生成每张幻灯片的完整图片
              </p>
            </div>
          )}
        </div>

        {/* 幻灯片数量 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            <FileText className="w-4 h-4 inline mr-2" />
            幻灯片数量: <span className="text-indigo-600 font-bold">{numSlides}</span> 页
          </label>
          <input
            type="range"
            min="4"
            max="15"
            value={numSlides}
            onChange={(e) => setNumSlides(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>4 页（简洁）</span>
            <span>15 页（详细）</span>
          </div>
        </div>

        {/* 文档信息 */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">基于文档</div>
              <div className="font-medium text-gray-800">{docName}</div>
            </div>
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerateOutline}
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5" />
          开始生成大纲
        </button>
      </div>
    </div>
  )

  // 渲染大纲编辑步骤
  const renderOutlineStep = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部：编辑区域 */}
      {editingIndex !== null && outline[editingIndex] && (
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center">
                  {editingIndex + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">编辑幻灯片</h3>
                  <p className="text-xs text-gray-500">第 {editingIndex + 1} 页，共 {outline.length} 页</p>
                </div>
              </div>
              {outline.length > 2 && (
                <button
                  onClick={() => {
                    handleDeleteOutlineItem(editingIndex)
                    setEditingIndex(null)
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-red-500 hover:bg-red-50 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* 标题编辑 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">幻灯片标题</label>
                <input
                  type="text"
                  value={outline[editingIndex].title}
                  onChange={(e) => handleUpdateOutlineItem(editingIndex, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* 要点编辑 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  内容要点（每行一个）
                </label>
                <textarea
                  value={outline[editingIndex].points?.join('\n') || ''}
                  onChange={(e) => handleUpdateOutlineItem(editingIndex, 'points', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder="每行输入一个要点..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 中间：大纲列表区域（网格布局） */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 text-sm text-indigo-700 mb-4">
            <strong>💡 提示：</strong>AI 会根据这些要点自动扩展生成详细的幻灯片内容，并选择合适的布局样式（如列表、时间线、对比图等）。
          </div>
          
          {/* 网格布局的幻灯片卡片 - 更小更紧凑 */}
          <div className="grid grid-cols-4 gap-3">
            {outline.map((item, index) => (
              <div
                key={index}
                onClick={() => setEditingIndex(index)}
                className={`h-28 rounded-lg cursor-pointer transition-all overflow-hidden ${
                  editingIndex === index 
                    ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-lg bg-white' 
                    : 'border border-gray-200 hover:border-indigo-300 hover:shadow bg-white'
                }`}
              >
                <div className="h-full p-3 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span className="text-xs font-medium text-gray-800 truncate flex-1">{item.title}</span>
                  </div>
                  <div className="flex-1 text-[10px] text-gray-500 space-y-0.5 overflow-hidden">
                    {item.points?.slice(0, 2).map((point, i) => (
                      <div key={i} className="truncate">• {point}</div>
                    ))}
                    {(item.points?.length || 0) > 2 && (
                      <div className="text-gray-400">+{item.points.length - 2} 更多</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 添加按钮 */}
            <div
              onClick={handleAddOutlineItem}
              className="h-28 rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500"
            >
              <Plus className="w-6 h-6 mb-1" />
              <span className="text-xs">添加</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // 渲染生成中状态 - 保持大纲布局，顶部显示进度盒子
  const renderGeneratingStep = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 顶部：生成进度盒子 */}
      <div className="bg-white border-b p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <div className="relative w-10 h-10 flex-shrink-0">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{loadingText || 'AI 正在生成精美幻灯片...'}</div>
              <div className="text-sm text-gray-500">基于 {outline.length} 个主题</div>
            </div>
            <div className="text-sm font-medium text-indigo-600">{loadingProgress}%</div>
          </div>
        </div>
      </div>

      {/* 中间：大纲列表区域（网格布局）- 实时预览生成进度 */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 text-sm text-indigo-700 mb-4">
            <strong>💡 提示：</strong>AI 会根据这些要点自动扩展生成详细的幻灯片内容，并选择合适的布局样式（如列表、时间线、对比图等）。
          </div>
          
          {/* 网格布局的幻灯片卡片 - 带生成动画 */}
          <div className="grid grid-cols-4 gap-3">
            {outline.map((item, index) => {
              const isGenerated = index < generatedCount
              const isGenerating = index === generatedCount
              
              return (
                <div
                  key={index}
                  className={`h-28 rounded-lg overflow-hidden transition-all duration-500 ${
                    isGenerated 
                      ? 'border-2 border-green-400 bg-white shadow-md scale-100 opacity-100' 
                      : isGenerating
                        ? 'border-2 border-indigo-400 bg-indigo-50 shadow-lg animate-pulse'
                        : 'border border-gray-200 bg-gray-100 opacity-50'
                  }`}
                  style={{
                    transform: isGenerated ? 'scale(1)' : isGenerating ? 'scale(1.02)' : 'scale(0.98)',
                    transition: 'all 0.3s ease-out'
                  }}
                >
                  <div className="h-full p-3 flex flex-col relative">
                    {/* 已生成标记 */}
                    {isGenerated && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {/* 生成中标记 */}
                    {isGenerating && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center ${
                        isGenerated ? 'bg-green-500' : isGenerating ? 'bg-indigo-500' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-xs font-medium text-gray-800 truncate flex-1">{item.title}</span>
                    </div>
                    <div className="flex-1 text-[10px] text-gray-500 space-y-0.5 overflow-hidden">
                      {item.points?.slice(0, 2).map((point, i) => (
                        <div key={i} className="truncate">• {point}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  // 渲染预览步骤 - NotebookLM 风格布局
  const renderPreviewStep = () => (
    <div className="flex-1 flex bg-gray-100 overflow-hidden">
      {/* 左侧：大图预览 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-100 to-gray-200">
        {slides.length > 0 && slides[currentSlideIndex]?.slide_image_url ? (
          <div className="relative w-full max-w-4xl">
            <img 
              src={slides[currentSlideIndex].slide_image_url}
              alt={`幻灯片 ${currentSlideIndex + 1}`}
              className="w-full rounded-lg shadow-2xl"
            />
            {/* 翻页按钮 */}
            <button 
              onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full rounded-lg shadow-lg"
            title="Presentation Preview"
          />
        )}
      </div>
      
      {/* 右侧：缩略图列表 */}
      {slides.length > 0 && slides[0]?.slide_image_url && (
        <div className="w-40 bg-white border-l overflow-y-auto p-2 space-y-2">
          {slides.map((slide, index) => (
            <div 
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                currentSlideIndex === index 
                  ? 'border-indigo-500 shadow-lg' 
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <div className="relative">
                <img 
                  src={slide.slide_image_url}
                  alt={`幻灯片 ${index + 1}`}
                  className="w-full"
                />
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩背景 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* 主内容区 */}
      <div className="relative w-[95vw] h-[80vh] max-w-7xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="text-lg font-bold text-gray-800">{title || docName}</div>
              <div className="text-xs text-gray-500">Presentation AI</div>
            </div>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center gap-3">
            {['配置', '大纲', '生成', '预览'].map((s, i) => {
              const stepIndex = ['config', 'outline', 'generating', 'preview'].indexOf(step)
              const isActive = i === stepIndex
              const isCompleted = i < stepIndex
              
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-2 ${isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive ? 'bg-indigo-100 text-indigo-600' : 
                      isCompleted ? 'bg-green-100 text-green-600' : 
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-sm font-medium">{s}</span>
                  </div>
                  {i < 3 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                </React.Fragment>
              )
            })}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            {step === 'outline' && (
              <button
                onClick={handleGenerateSlides}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                生成幻灯片
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                {slides.length > 0 && slides[0]?.slide_image_url ? '下载 PDF' : '下载 PPTX'}
              </button>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        {step === 'config' && !isLoading && renderConfigStep()}
        {step === 'outline' && renderOutlineStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'preview' && renderPreviewStep()}
        
        {/* 配置页加载状态 */}
        {step === 'config' && isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
            <div className="text-lg text-gray-600">{loadingText}</div>
            <div className="w-48 h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PresentationEditor
