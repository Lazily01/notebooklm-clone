import React, { useState, useRef, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  Send, 
  Trash2, 
  FileAudio, 
  File, 
  Loader2,
  BookOpen,
  List,
  MessageSquare,
  X,
  Mic,
  Video,
  Network,
  FileBarChart,
  Layers,
  HelpCircle,
  Image,
  Presentation,
  StickyNote,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Pencil,
  Share2,
  AlertCircle,
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
  Download
} from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import './styles/design-system.css'
import PdfViewer from './components/PdfViewer'
import MindmapView from './components/MindmapView'
import FlashcardView from './components/FlashcardView'
import QuizView from './components/QuizView'
import InfoGraphicView from './components/InfoGraphicView'
import InfographicStyleModal from './components/InfographicStyleModal'
import AudioConfigModal from './components/AudioConfigModal'
import ReportConfigModal from './components/ReportConfigModal'
import SlidesConfigModal from './components/SlidesConfigModal'
import SlidesView from './components/SlidesView'
import PPTEditor from './components/PPTEditor'
import PresentationEditor from './components/PresentationEditor'
import { ToastProvider, useToast } from './components/Toast'
import ExcelPreview from './components/ExcelPreview'
import WordPreview from './components/WordPreview'
import WebPreview from './components/WebPreview'
import URLInputModal from './components/URLInputModal'
import PasteTextModal from './components/PasteTextModal'
import WebSearch from './components/WebSearch'

const API_BASE = 'http://localhost:8000'

// 工作室内嵌音频播放器组件（使用共享状态）
const StudioAudioPlayer = ({ audioRef, isPlaying, currentTime, duration, onTogglePlay, onSeek, onClose, onExpand }) => {
  const [isDragging, setIsDragging] = useState(false)
  const progressRef = useRef(null)
  const durationRef = useRef(duration)
  const onSeekRef = useRef(onSeek)

  // 保持最新引用
  useEffect(() => {
    durationRef.current = duration
    onSeekRef.current = onSeek
  }, [duration, onSeek])

  // 空格键控制播放/暂停
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        onTogglePlay()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onTogglePlay])

  const seekToPosition = (clientX) => {
    const progressBar = progressRef.current
    if (!progressBar) return
    const rect = progressBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newTime = percent * durationRef.current
    if (onSeekRef.current) {
      onSeekRef.current(newTime)
    }
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    seekToPosition(e.clientX)
  }

  useEffect(() => {
    if (!isDragging) return
    
    const handleMouseMove = (e) => {
      e.preventDefault()
      seekToPosition(e.clientX)
    }
    const handleMouseUp = () => setIsDragging(false)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2">
      {/* 播放按钮 */}
      <button
        onClick={onTogglePlay}
        className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* 进度条 - 可拖动 */}
      <div 
        ref={progressRef}
        className="w-20 h-1.5 bg-gray-300 rounded-full cursor-pointer flex-shrink-0 relative group"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
        {/* 拖动手柄 */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* 时间 */}
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* 放大按钮 */}
      <button onClick={onExpand} className="p-1 hover:bg-amber-100 rounded text-gray-500">
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded text-gray-500">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// 音频波形线条组件 - 纯视觉动画
const AudioWaveformVisualizer = ({ isPlaying }) => {
  const [waveData, setWaveData] = useState([])
  const animationRef = useRef(null)

  // 播放时波形跳动动画
  useEffect(() => {
    if (!isPlaying) {
      // 停止时显示静态平直线
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      const staticLines = [[], [], []]
      for (let i = 0; i < 100; i++) {
        const x = (i / 100) * 1000
        staticLines[0].push({ x, y: 50 })
        staticLines[1].push({ x, y: 50 })
        staticLines[2].push({ x, y: 50 })
      }
      setWaveData(staticLines)
      return
    }

    // 播放时动画
    const animate = () => {
      const t = Date.now()
      const lines = [[], [], []]
      
      for (let i = 0; i < 100; i++) {
        const x = (i / 100) * 1000
        // 3条线，不同频率和振幅的正弦波叠加
        lines[0].push({ 
          x, 
          y: 50 + Math.sin(t / 150 + i * 0.15) * 20 + Math.sin(t / 80 + i * 0.3) * 10 
        })
        lines[1].push({ 
          x, 
          y: 50 + Math.sin(t / 200 + i * 0.12 + 2) * 15 + Math.sin(t / 100 + i * 0.25) * 8 
        })
        lines[2].push({ 
          x, 
          y: 50 + Math.sin(t / 180 + i * 0.18 + 4) * 12 + Math.sin(t / 120 + i * 0.2) * 6 
        })
      }
      
      setWaveData(lines)
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  // 生成平滑曲线
  const generatePath = (points) => {
    if (!points || points.length < 2) return ''
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const curr = points[i]
      path += ` L ${curr.x} ${curr.y}`
    }
    return path
  }

  const colors = ['#8B5CF6', '#06B6D4', '#10B981']

  return (
    <div className="w-full px-8">
      <div className="w-full h-24 relative">
        <svg viewBox="0 0 1000 100" className="w-full h-full" preserveAspectRatio="none">
          {waveData.map((points, idx) => (
            <path
              key={idx}
              d={generatePath(points)}
              fill="none"
              stroke={colors[idx]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

// 底部进度条组件
const ProgressBar = ({ currentTime, duration, onSeek }) => {
  const [isDragging, setIsDragging] = useState(false)
  const progressRef = useRef(null)
  const onSeekRef = useRef(onSeek)
  const durationRef = useRef(duration)

  // 保持最新的引用
  useEffect(() => {
    onSeekRef.current = onSeek
    durationRef.current = duration
  }, [onSeek, duration])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const seekToPosition = (clientX) => {
    if (!progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percent * durationRef.current
    if (onSeekRef.current) {
      onSeekRef.current(newTime)
    }
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    seekToPosition(e.clientX)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      e.preventDefault()
      seekToPosition(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div 
      ref={progressRef}
      className="flex-1 h-12 bg-gray-100 rounded-full relative cursor-pointer overflow-hidden group select-none"
      onMouseDown={handleMouseDown}
    >
      {/* 进度填充 */}
      <div 
        className="absolute inset-y-0 left-0 bg-blue-500/20"
        style={{ width: `${progress}%` }}
      />
      
      {/* 时间文本 */}
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-600 pointer-events-none">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      
      {/* 悬停效果 */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
    </div>
  )
}

// 全屏音频面板组件（使用共享状态）
const FullscreenAudioPanel = ({ audioId, title, isPlaying, currentTime, duration, dialogues, onTogglePlay, onSeek, onReset, onClose }) => {
  const [showFullText, setShowFullText] = useState(false)

  // 根据当前时间计算正在播放的文字
  const getCurrentText = () => {
    if (!dialogues || dialogues.length === 0) return ''
    
    // 简单估算：假设每段对话平均时长 = 总时长 / 对话数
    const avgDuration = duration / dialogues.length
    const currentIndex = Math.min(
      Math.floor(currentTime / avgDuration),
      dialogues.length - 1
    )
    
    if (currentIndex >= 0 && dialogues[currentIndex]) {
      return dialogues[currentIndex].text
    }
    return ''
  }

  // 键盘快捷键：空格播放/暂停，ESC退出
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 如果焦点在输入框则不触发
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.code === 'Space') {
        e.preventDefault()
        onTogglePlay()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onTogglePlay, onClose])

  const currentText = getCurrentText()

  return (
    <>
      {/* 全屏遮罩 */}
      <div 
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div className="fixed inset-8 z-50 rounded-3xl shadow-2xl bg-white flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">演播室</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-800">音频概述</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col">
          {/* 标题行 - 标题和下载按钮 */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">{title} 音频概述</h1>
            {/* 下载按钮 */}
            <a
              href={`${API_BASE}/audio/${audioId}`}
              download={`${title}_音频概述.mp3`}
              className="px-4 py-2 text-sm bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              下载
            </a>
          </div>

          {/* 波形区域 - 纯视觉动画 */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <AudioWaveformVisualizer isPlaying={isPlaying} />
            
            {/* 当前播放的文字 */}
            <div className="mt-32 px-16 text-center">
              <p className="text-3xl text-gray-700 leading-relaxed transition-all duration-300">
                {currentText || ''}
              </p>
            </div>
          </div>
        </div>

        {/* 底部控制区 */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-6 w-full max-w-3xl mx-auto">
            {/* 播放/暂停按钮 */}
            <button
              onClick={onTogglePlay}
              className="w-12 h-12 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* 进度条药丸 */}
            <ProgressBar 
              currentTime={currentTime} 
              duration={duration}
              onSeek={onSeek}
            />

            {/* 重置按钮 */}
            <button 
              onClick={onReset}
              className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex-shrink-0"
              title="重置到开头"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>

            {/* 查看全文按钮 */}
            <button 
              onClick={() => setShowFullText(true)}
              className="px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
            >
              查看全文
            </button>
          </div>
        </div>
      </div>

      {/* 全文弹窗 */}
      {showFullText && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFullText(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
            {/* 弹窗标题 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">音频全文</h3>
              <button 
                onClick={() => setShowFullText(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 全文内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {dialogues && dialogues.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className={`text-sm font-medium flex-shrink-0 ${item.speaker === 'A' ? 'text-blue-600' : 'text-green-600'}`}>
                      {item.speaker === 'A' ? '主持人' : '嘉宾'}:
                    </span>
                    <p className="text-gray-700 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  const toast = useToast()
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  
  // 面板宽度状态
  const [leftPanelWidth, setLeftPanelWidth] = useState(320) // 默认 320px (w-80)
  const [rightPanelWidth, setRightPanelWidth] = useState(500) // 默认 500px
  const [studioWidth, setStudioWidth] = useState(480) // 工作室默认 480px
  const [activeTab, setActiveTab] = useState('chat')
  const [summary, setSummary] = useState('')
  const [outline, setOutline] = useState('')
  const [pdfPreview, setPdfPreview] = useState({ show: false, docId: null, page: 1 })
  const [audioPreview, setAudioPreview] = useState({ show: false, docId: null, content: '', timestamp: null })
  const [hoverPreview, setHoverPreview] = useState({ show: false, docId: null, page: 1, x: 0, y: 0 })
  const [excelPreview, setExcelPreview] = useState({ show: false, docId: null })
  const [webPreview, setWebPreview] = useState({ show: false, docId: null })
  const [wordPreview, setWordPreview] = useState({ show: false, docId: null })
  const [showStudio, setShowStudio] = useState(true)
  const [notes, setNotes] = useState([])
  const [showNoteEditor, setShowNoteEditor] = useState(false)
  const [currentNote, setCurrentNote] = useState(null)
  const [showAddSourceModal, setShowAddSourceModal] = useState(false)
  const [showURLInputModal, setShowURLInputModal] = useState(false)
  const [showPasteTextModal, setShowPasteTextModal] = useState(false)
  const [showSummaryPanel, setShowSummaryPanel] = useState(false)
  const [showOutlinePanel, setShowOutlinePanel] = useState(false)
  const [showMindmapPanel, setShowMindmapPanel] = useState(false)
  const [mindmapContent, setMindmapContent] = useState('')
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false)
  const [isMindmapFullscreen, setIsMindmapFullscreen] = useState(false)
  const [showFlashcardPanel, setShowFlashcardPanel] = useState(false)
  const [flashcards, setFlashcards] = useState([])
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [isFlashcardFullscreen, setIsFlashcardFullscreen] = useState(false)
  const [showQuizPanel, setShowQuizPanel] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isQuizFullscreen, setIsQuizFullscreen] = useState(false)
  const [showAudioPanel, setShowAudioPanel] = useState(false)
  const [isAudioFullscreen, setIsAudioFullscreen] = useState(false)
  const [showInfoGraphicPanel, setShowInfoGraphicPanel] = useState(false)
  const [infographicData, setInfoGraphicData] = useState(null)
  const [infographicCache, setInfographicCache] = useState({}) // 按文档ID缓存信息图
  
  // 工作室内容缓存（按任务ID）
  const [studioCache, setStudioCache] = useState({
    flashcards: {},   // { taskId: flashcards[] }
    quiz: {},         // { taskId: questions[] }
    mindmap: {},      // { taskId: content }
    summary: {},      // { taskId: content }
    outline: {}       // { taskId: content }
  })
  const [isGeneratingInfoGraphic, setIsGeneratingInfoGraphic] = useState(false)
  const [isInfoGraphicFullscreen, setIsInfoGraphicFullscreen] = useState(false)
  const [showInfographicStyleModal, setShowInfographicStyleModal] = useState(false)
  const [infographicProgress, setInfographicProgress] = useState('')
  
  // 工作室任务列表
  const [studioTasks, setStudioTasks] = useState([])
  // 任务格式: { id, type: 'flashcard'|'quiz'|'mindmap'|'summary'|'outline', title, status: 'loading'|'done', createdAt, docName }
  const [taskMenuOpen, setTaskMenuOpen] = useState(null) // 当前打开菜单的任务ID
  const [editingTaskId, setEditingTaskId] = useState(null) // 正在编辑的任务ID
  const [editingTaskTitle, setEditingTaskTitle] = useState('') // 编辑中的标题
  const [deleteConfirmId, setDeleteConfirmId] = useState(null) // 确认删除的任务ID
  const [docMenuOpen, setDocMenuOpen] = useState(null) // 文档菜单打开的ID
  const [editingDocId, setEditingDocId] = useState(null) // 正在编辑的文档ID
  const [editingDocName, setEditingDocName] = useState('') // 编辑中的文档名
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState(null) // 确认删除的文档ID
  const [audioTranscript, setAudioTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // 音频概述状态
  const [showAudioConfigModal, setShowAudioConfigModal] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null) // { audioId, title, dialogues }
  
  // 报告状态
  const [showReportConfigModal, setShowReportConfigModal] = useState(false)
  const [showReportPanel, setShowReportPanel] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  
  // 视频概述状态
  const [showVideoOverviewPanel, setShowVideoOverviewPanel] = useState(false)
  const [videoOverviewData, setVideoOverviewData] = useState(null)
  const [isGeneratingVideoOverview, setIsGeneratingVideoOverview] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [showVideoConfigModal, setShowVideoConfigModal] = useState(false)
  const [videoLength, setVideoLength] = useState('short') // 'short' | 'default'
  const [videoStyle, setVideoStyle] = useState('documentary') // 'cartoon' | 'documentary' | 'narrative' | 'short'
  const [showVideoPlayerModal, setShowVideoPlayerModal] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null)
  const [currentVideoTitle, setCurrentVideoTitle] = useState('')
  
  // 幻灯片状态
  const [showSlidesConfigModal, setShowSlidesConfigModal] = useState(false)
  const [showSlidesPanel, setShowSlidesPanel] = useState(false)
  const [slidesData, setSlidesData] = useState([])
  const [slidesTitle, setSlidesTitle] = useState('')
  const [slidesStyle, setSlidesStyle] = useState('business')
  const [slidesDocId, setSlidesDocId] = useState(null)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  
  // PPT 编辑器状态（LandPPT 风格）
  const [showPPTEditor, setShowPPTEditor] = useState(false)
  const [pptEditorDocId, setPptEditorDocId] = useState(null)
  const [pptEditorDocName, setPptEditorDocName] = useState('')
  const [pptEditorProjectId, setPptEditorProjectId] = useState(null)  // 已生成的项目ID
  
  // 全局音频播放状态（小播放器和全屏共享）
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioDialogues, setAudioDialogues] = useState([]) // 对话脚本
  const globalAudioRef = useRef(null)
  
  const fileInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  // 拖动处理函数
  const handleLeftResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftPanelWidth
    
    const handleMouseMove = (e) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(250, Math.min(600, startWidth + delta))
      setLeftPanelWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }
  
  const handleRightResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = rightPanelWidth
    
    const handleMouseMove = (e) => {
      const delta = startX - e.clientX
      const newWidth = Math.max(400, Math.min(1000, startWidth + delta))
      setRightPanelWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }
  
  const handleStudioResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = studioWidth
    
    const handleMouseMove = (e) => {
      const delta = startX - e.clientX
      const newWidth = Math.max(380, Math.min(800, startWidth + delta))
      setStudioWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 自动滚动到音频高亮行
  useEffect(() => {
    if (audioPreview.show && audioPreview.timestamp) {
      setTimeout(() => {
        const el = document.getElementById('audio-highlight')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [audioPreview.show, audioPreview.timestamp, audioPreview.content])

  useEffect(() => {
    fetchDocuments()
    fetchStudioTasks()
  }, [])

  // 从后端加载工作室任务
  const fetchStudioTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/studio/tasks`)
      if (response.data.tasks) {
        setStudioTasks(response.data.tasks)
      }
    } catch (error) {
      console.error('获取工作室任务失败:', error)
    }
  }

  // 同步任务到后端
  const syncTaskToBackend = async (task) => {
    try {
      await axios.post(`${API_BASE}/studio/tasks`, task)
    } catch (error) {
      console.error('同步任务失败:', error)
    }
  }

  // 从后端删除任务
  const deleteTaskFromBackend = async (taskId) => {
    try {
      await axios.delete(`${API_BASE}/studio/tasks/${taskId}`)
    } catch (error) {
      console.error('删除任务失败:', error)
    }
  }

  // 任务变化时同步到后端（防抖）
  const lastSyncedTasksRef = useRef(null)
  useEffect(() => {
    // 跳过初始加载
    if (lastSyncedTasksRef.current === null) {
      lastSyncedTasksRef.current = JSON.stringify(studioTasks)
      return
    }
    
    const currentTasks = JSON.stringify(studioTasks)
    if (currentTasks === lastSyncedTasksRef.current) return
    
    // 找出变化的任务并同步
    const syncTasks = async () => {
      for (const task of studioTasks) {
        await syncTaskToBackend(task)
      }
    }
    
    const timer = setTimeout(syncTasks, 500) // 500ms 防抖
    lastSyncedTasksRef.current = currentTasks
    
    return () => clearTimeout(timer)
  }, [studioTasks])

  // 点击其他地方关闭任务菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setTaskMenuOpen(null)
      setDocMenuOpen(null)
    }
    if (taskMenuOpen || docMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [taskMenuOpen, docMenuOpen])

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/documents`)
      setDocuments(response.data)
    } catch (error) {
      console.error('获取文档列表失败:', error)
    }
  }

  // 会话管理
  const initializeConversation = async () => {
    try {
      // 检查是否有现有会话
      const response = await axios.get(`${API_BASE}/conversations`)
      const conversations = response.data.conversations
      
      if (conversations.length > 0) {
        // 加载最新的会话
        const latestConv = conversations[0]
        setCurrentConversationId(latestConv.id)
        
        // 加载会话消息
        const convResponse = await axios.get(`${API_BASE}/conversations/${latestConv.id}`)
        setMessages(convResponse.data.messages)
      } else {
        // 创建新会话
        const createResponse = await axios.post(`${API_BASE}/conversations`, {
          title: '新对话'
        })
        setCurrentConversationId(createResponse.data.id)
      }
    } catch (error) {
      console.error('初始化会话失败:', error)
      // 如果失败，创建一个新会话
      try {
        const createResponse = await axios.post(`${API_BASE}/conversations`, {
          title: '新对话'
        })
        setCurrentConversationId(createResponse.data.id)
      } catch (err) {
        console.error('创建会话失败:', err)
      }
    }
  }

  const saveMessage = async (role, content, sources = null, suggestions = null, citationMap = null) => {
    if (!currentConversationId) return
    
    try {
      await axios.post(`${API_BASE}/conversations/${currentConversationId}/messages`, {
        conversation_id: currentConversationId,
        role,
        content,
        sources,
        suggestions,
        citation_map: citationMap
      })
    } catch (error) {
      console.error('保存消息失败:', error)
    }
  }

  // 组件加载时初始化
  useEffect(() => {
    fetchDocuments()
    initializeConversation()
  }, [])

  // 全局音频控制 - 使用 callback ref 确保正确绑定
  const setupAudioRef = (audio) => {
    if (!audio) return
    globalAudioRef.current = audio
    
    audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime)
    audio.onloadedmetadata = () => setAudioDuration(audio.duration)
    audio.onended = () => setAudioPlaying(false)
    audio.onplay = () => setAudioPlaying(true)
    audio.onpause = () => setAudioPlaying(false)
  }

  const toggleAudioPlay = () => {
    const audio = globalAudioRef.current
    if (!audio) return
    if (audioPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const seekAudio = (time) => {
    const audio = globalAudioRef.current
    if (!audio) return
    
    // 确保时间有效
    if (isNaN(time) || time < 0) time = 0
    if (audio.duration && time > audio.duration) time = audio.duration
    
    // 设置音频时间并立即更新UI
    audio.currentTime = time
    setAudioCurrentTime(time)
  }

  const resetAudio = () => {
    const audio = globalAudioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setAudioCurrentTime(0)
    setAudioPlaying(false)
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setShowAddSourceModal(false) // 立即关闭弹窗

    // 并行上传所有文件（不阻塞UI）
    files.forEach(async (file) => {
      // 先创建一个临时文档显示上传中状态
      const tempId = `uploading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tempDoc = {
        id: tempId,
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') || file.name.endsWith('.doc') ? 'word' : 'text',
        content_preview: '__uploading__',  // 特殊标记表示上传中
      }
      setDocuments(prev => [...prev, tempDoc])

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await axios.post(`${API_BASE}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000  // 120秒超时，给 Excel 文件上传和解析留足够时间
        })
        const newDoc = response.data
        
        // 替换临时文档为真实文档
        setDocuments(prev => prev.map(d => d.id === tempId ? newDoc : d))
        
        // 检查解析状态
        if (newDoc.type === 'audio') {
          // 音频文件启动转录轮询
          pollTranscriptionStatus(newDoc.id)
        } else if (newDoc.parsing_status === 'processing') {
          // 文件正在解析，启动轮询
          pollParsingStatus(newDoc.id)
        } else {
          // 文件已就绪，自动选中
          setSelectedDocs(prev => [...prev, newDoc.id])
        }
      } catch (error) {
        console.error(`上传失败: ${file.name}`, error)
        // 上传失败，移除临时文档
        setDocuments(prev => prev.filter(d => d.id !== tempId))
      }
    })

    if (event.target.value) event.target.value = ''
  }

  const handleURLSubmit = async (url) => {
    setShowURLInputModal(false)
    try {
      const response = await axios.post(`${API_BASE}/import-url`, { url })
      const newDoc = response.data
      setDocuments(prev => [...prev, newDoc])
      setSelectedDocs(prev => [...prev, newDoc.id])
      toast.success('网页导入成功')
    } catch (error) {
      console.error('网页导入失败:', error)
      toast.error('网页导入失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handlePasteTextSubmit = async (text) => {
    try {
      toast.info('正在处理文本...')
      const response = await axios.post(`${API_BASE}/paste-text`, { text })
      const newDoc = response.data
      setDocuments(prev => [...prev, newDoc])
      setSelectedDocs(prev => [...prev, newDoc.id])
      toast.success(`文本已添加: ${newDoc.name}`)
      setShowAddSourceModal(false)
    } catch (error) {
      console.error('粘贴文本失败:', error)
      toast.error('粘贴文本失败: ' + (error.response?.data?.detail || error.message))
      throw error
    }
  }

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsTranscribing(true)
    setShowAudioPanel(true)
    setAudioTranscript('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // 上传成功，添加到文档列表
      const newDoc = response.data
      setDocuments(prev => [...prev, newDoc])
      setSelectedDocs(prev => [...prev, newDoc.id])
      
      // 开始轮询转录状态
      pollTranscriptionStatus(newDoc.id)
    } catch (error) {
      toast.error('上传失败: ' + (error.response?.data?.detail || error.message))
      setShowAudioPanel(false)
      setIsTranscribing(false)
    } finally {
      if (event.target.value) event.target.value = ''
    }
  }

  const pollTranscriptionStatus = async (docId) => {
    const maxAttempts = 120 // 最多轮询 2 分钟
    let attempts = 0
    
    const poll = async () => {
      try {
        const response = await axios.get(`${API_BASE}/transcription/${docId}`)
        const { status, text, error } = response.data
        
        if (status === 'completed') {
          setAudioTranscript(text)
          setIsTranscribing(false)
          // 更新文档列表中的内容
          setDocuments(prev => prev.map(d => 
            d.id === docId ? { ...d, content_preview: text.slice(0, 200) + '...' } : d
          ))
        } else if (status === 'failed') {
          setAudioTranscript(`转录失败: ${error || '未知错误'}`)
          setIsTranscribing(false)
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 1000) // 每秒轮询一次
        } else {
          setAudioTranscript('转录超时，请重试')
          setIsTranscribing(false)
        }
      } catch (error) {
        console.error('轮询失败:', error)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 2000)
        }
      }
    }
    
    poll()
  }

  const pollParsingStatus = async (docId) => {
    const maxAttempts = 60 // 最多轮询 2 分钟
    let attempts = 0
    
    const poll = async () => {
      try {
        const response = await axios.get(`${API_BASE}/documents/${docId}/parsing-status`)
        const { status, error } = response.data
        
        if (status === 'ready') {
          // 解析完成，更新文档状态并自动选中
          setDocuments(prev => prev.map(d => 
            d.id === docId ? { ...d, parsing_status: 'ready' } : d
          ))
          setSelectedDocs(prev => [...prev, docId])
          console.log(`[Parsing] 文档 ${docId} 解析完成`)
        } else if (status === 'error') {
          // 解析失败
          setDocuments(prev => prev.map(d => 
            d.id === docId ? { ...d, parsing_status: 'error' } : d
          ))
          toast.error(`文件解析失败: ${error || '未知错误'}`)
        } else if (attempts < maxAttempts) {
          // 继续轮询
          attempts++
          setTimeout(poll, 2000) // 每2秒轮询一次
        } else {
          // 超时
          setDocuments(prev => prev.map(d => 
            d.id === docId ? { ...d, parsing_status: 'error' } : d
          ))
          toast.error('文件解析超时')
        }
      } catch (error) {
        console.error('轮询解析状态失败:', error)
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(poll, 2000)
        }
      }
    }
    
    poll()
  }

  const handleDeleteDocument = async (docId) => {
    try {
      await axios.delete(`${API_BASE}/documents/${docId}`)
      setDocuments(documents.filter(d => d.id !== docId))
      setSelectedDocs(selectedDocs.filter(id => id !== docId))
    } catch (error) {
      toast.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSendMessage = async (customMessage) => {
    const messageToSend = customMessage || inputMessage
    if (!messageToSend.trim() || isLoading) return

    const userMessage = { role: 'user', content: messageToSend }
    setMessages([...messages, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // 保存用户消息到数据库
    await saveMessage('user', messageToSend)

    // 添加一个空的助手消息用于流式更新
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      // 使用流式接口
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          document_ids: selectedDocs
        })
      })

      if (!response.ok) {
        throw new Error('请求失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = '' // 缓冲区，用于渐进式输出
      let charCount = 0 // 已输出字符数

      // 渐进式输出函数
      const displayWithDelay = async (newContent) => {
        buffer += newContent
        
        while (buffer.length > 0) {
          // 取出一个字符
          const char = buffer[0]
          buffer = buffer.slice(1)
          fullContent += char
          charCount++
          
          // 根据已输出字符数决定延迟时间（豆包策略）
          let delay = 5 // 默认快速
          if (charCount <= 10) {
            delay = 50 // 前 10 个字符慢（0.5秒开始）
          } else if (charCount <= 30) {
            delay = 20 // 第 11-30 字符中速
          }
          // 第 31+ 字符：5ms（快速）
          
          // 更新 UI
          setMessages(prev => {
            const newMessages = [...prev]
            newMessages[assistantMessageIndex] = {
              role: 'assistant',
              content: fullContent,
              streaming: true
            }
            return newMessages
          })
          
          // 延迟
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                throw new Error(data.error)
              }
              
              if (data.content) {
                // 使用渐进式输出
                await displayWithDelay(data.content)
              }
              
              if (data.replace !== undefined) {
                fullContent = data.replace
                setMessages(prev => {
                  const newMessages = [...prev]
                  const currentMsg = newMessages[assistantMessageIndex]
                  newMessages[assistantMessageIndex] = {
                    role: 'assistant',
                    content: data.replace,
                    sources: currentMsg?.sources || [],  // 保留已有的 sources
                    citationMap: data.citation_map || {},  // 保存引用映射
                    suggestions: currentMsg?.suggestions || []  // 保留已有的 suggestions
                  }
                  return newMessages
                })
              }
              
              if (data.sources) {
                // 接收到引用来源
                console.log('接收到 sources 数据:', data.sources)
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[assistantMessageIndex] = {
                    ...newMessages[assistantMessageIndex],
                    sources: data.sources
                  }
                  console.log('保存后的消息:', newMessages[assistantMessageIndex])
                  return newMessages
                })
              }
              
              if (data.suggestions) {
                // 接收到联想问题
                console.log('接收到 suggestions 数据:', data.suggestions)
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[assistantMessageIndex] = {
                    ...newMessages[assistantMessageIndex],
                    suggestions: data.suggestions
                  }
                  return newMessages
                })
              }
              
              if (data.done) {
                // 清空缓冲区
                if (buffer.length > 0) {
                  await displayWithDelay('')
                }
                
                // 流式结束，标记为完成（保留 sources）
                setMessages(prev => {
                  const newMessages = [...prev]
                  const currentMsg = newMessages[assistantMessageIndex]
                  newMessages[assistantMessageIndex] = {
                    ...currentMsg,  // 保留所有现有属性，包括 sources
                    role: 'assistant',
                    content: fullContent,
                    streaming: false
                  }
                  
                  // 保存助手消息到数据库
                  saveMessage(
                    'assistant',
                    fullContent,
                    currentMsg.sources || null,
                    currentMsg.suggestions || null,
                    currentMsg.citationMap || null
                  )
                  
                  return newMessages
                })
              }
            } catch (e) {
              console.error('解析 SSE 数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('流式聊天失败:', error)
      // 更新为错误消息
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: '抱歉，发生了错误: ' + error.message,
          streaming: false
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNote = (content) => {
    // 去掉引用标记 [1], [2], [3] 等
    const cleanContent = content.replace(/\[(\d+)\]/g, '')
    
    // 检查是否已经存在完全相同内容的笔记（防止重复保存）
    const isDuplicate = notes.some(note => note.content === cleanContent)
    
    if (isDuplicate) {
      toast.info('该笔记已存在')
      // 打开已存在的笔记
      const existingNote = notes.find(note => note.content === cleanContent)
      setCurrentNote(existingNote)
      setShowNoteEditor(true)
      setShowStudio(true)
      return
    }
    
    const newNote = {
      id: `note_${Date.now()}`,
      content: cleanContent,
      createdAt: new Date(),
      title: cleanContent.substring(0, 50) + (cleanContent.length > 50 ? '...' : '')
    }
    setNotes(prev => [...prev, newNote])
    setCurrentNote(newNote)
    setShowNoteEditor(true)
    setShowStudio(true)
    toast.success('笔记已保存')
  }

  const handleGenerateSummary = async (docId, regenerate = false) => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `summary-${Date.now()}`
    
    // 如果文档已有摘要且不需要重新生成，直接显示
    if (doc?.summary && !regenerate) {
      setSummary(doc.summary)
      setShowSummaryPanel(true)
      toast.success('已加载摘要')
      return
    }
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'summary',
      title: regenerate ? '重新生成摘要......' : '生成摘要......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    setIsLoading(true)
    setSummary('')
    try {
      const response = await axios.post(`${API_BASE}/summarize/${docId}?regenerate=${regenerate}`)
      const newSummary = response.data.summary
      setSummary(newSummary)
      setActiveTab('summary')
      
      // 更新文档的摘要缓存
      setDocuments(prev => prev.map(d => 
        d.id === docId ? { ...d, summary: newSummary } : d
      ))
      
      // 保存到缓存（用taskId作为key）
      setStudioCache(prev => ({
        ...prev,
        summary: { ...prev.summary, [taskId]: newSummary }
      }))
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 摘要`, status: 'done' }
          : task
      ))
      
      setShowSummaryPanel(true)
    } catch (error) {
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成摘要失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateOutline = async (docId) => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `outline-${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'outline',
      title: '生成大纲......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    setIsLoading(true)
    setOutline('')
    try {
      const response = await axios.post(`${API_BASE}/outline/${docId}`)
      const newOutline = response.data.outline
      setOutline(newOutline)
      setActiveTab('outline')
      
      // 保存到缓存（用taskId作为key）
      setStudioCache(prev => ({
        ...prev,
        outline: { ...prev.outline, [taskId]: newOutline }
      }))
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 大纲`, status: 'done' }
          : task
      ))
      
      setShowOutlinePanel(true)
    } catch (error) {
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成大纲失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // 生成视频概述（含自动合成视频）
  const handleGenerateVideoOverview = async (docId, length = 'short', style = 'documentary') => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `video-overview-${Date.now()}`
    
    const styleNames = {
      cartoon: '动画卡通',
      documentary: '纪录片',
      narrative: '叙事',
      short: '短视频'
    }
    
    // 添加到工作室任务列表（类似图片中的效果）
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'video-overview',
      title: '生成视频概述......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId,
      subtitle: '可能需要一些时间'
    }])
    
    setIsGeneratingVideoOverview(true)
    setVideoOverviewData(null)
    setShowVideoConfigModal(false)
    
    try {
      // 1. 生成大纲+配图
      const response = await axios.post(`${API_BASE}/video/overview/${docId}`, {
        length: length,
        style: style
      })
      const data = response.data
      setVideoOverviewData(data)
      // 不自动展开视频概述面板
      
      // 更新任务状态
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '正在合成视频......', subtitle: '基于1个来源' }
          : task
      ))
      
      // 2. 自动合成视频
      setIsGeneratingVideo(true)
      // 生成视频
      const videoResponse = await axios.post(
        `${API_BASE}/video/generate/${docId}?voice=Cherry`
      )
      
      // 使用后端返回的视频 URL
      const videoUrl = `${API_BASE}/video/${videoResponse.data.video_id}`
      console.log('视频生成成功:', videoUrl)
      
      // 完成后更新状态，保存概述数据到任务中
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 视频概述`, status: 'done', videoUrl: videoUrl, overviewData: data }
          : task
      ))
      
    } catch (error) {
      console.error('生成视频失败:', error)
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成视频失败', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingVideoOverview(false)
      setIsGeneratingVideo(false)
    }
  }

  const handleGenerateMindmap = async (docId) => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `mindmap-${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'mindmap',
      title: '生成思维导图......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    setIsGeneratingMindmap(true)
    setMindmapContent('')
    try {
      // 调用后端 API，format=png 返回图片
      const response = await axios.post(`${API_BASE}/mindmap/${docId}?format=png`)
      const imageUrl = response.data.image_url  // 图片 URL
      const markdown = response.data.mindmap    // Markdown 文本（可选）
      
      // 保存图片 URL 而不是 Markdown
      setMindmapContent(imageUrl)
      
      // 保存到缓存（用taskId作为key）
      setStudioCache(prev => ({
        ...prev,
        mindmap: { ...prev.mindmap, [taskId]: imageUrl }
      }))
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 思维导图`, status: 'done' }
          : task
      ))
      
      setShowMindmapPanel(true)
    } catch (error) {
      console.error('生成思维导图失败:', error)
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成思维导图失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingMindmap(false)
    }
  }

  const handleGenerateFlashcards = async (docId) => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `flashcard-${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'flashcard',
      title: '生成闪卡......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    console.log('开始生成闪卡, docId:', docId)
    setIsGeneratingFlashcards(true)
    setFlashcards([])
    try {
      const response = await axios.post(`${API_BASE}/flashcards/${docId}`)
      console.log('闪卡生成成功:', response.data)
      const newFlashcards = response.data.flashcards || []
      setFlashcards(newFlashcards)
      
      // 保存到缓存（用taskId作为key）
      setStudioCache(prev => ({
        ...prev,
        flashcards: { ...prev.flashcards, [taskId]: newFlashcards }
      }))
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 闪卡`, status: 'done' }
          : task
      ))
      
      setShowFlashcardPanel(true)
    } catch (error) {
      console.error('闪卡生成失败:', error)
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成闪卡失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleGenerateQuiz = async (docId) => {
    const doc = documents.find(d => d.id === docId)
    const taskId = `quiz-${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'quiz',
      title: '生成测验......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    console.log('开始生成测验, docId:', docId)
    setIsGeneratingQuiz(true)
    setQuizQuestions([])
    try {
      const response = await axios.post(`${API_BASE}/quiz/${docId}`)
      console.log('测验生成成功:', response.data)
      const newQuiz = response.data.quiz || []
      setQuizQuestions(newQuiz)
      
      // 保存到缓存（用taskId作为key）
      setStudioCache(prev => ({
        ...prev,
        quiz: { ...prev.quiz, [taskId]: newQuiz }
      }))
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 测验`, status: 'done' }
          : task
      ))
      
      setShowQuizPanel(true)
    } catch (error) {
      console.error('测验生成失败:', error)
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成测验失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleGenerateInfoGraphic = async (docId, options = {}) => {
    // 兼容旧的字符串参数和新的对象参数
    const style = typeof options === 'string' ? options : (options.style || '商务简约')
    const orientation = typeof options === 'object' ? (options.orientation || 'landscape') : 'landscape'
    const detailLevel = typeof options === 'object' ? (options.detailLevel || 'standard') : 'standard'
    
    const doc = documents.find(d => d.id === docId)
    const taskId = `infographic-${Date.now()}`
    
    // 关闭弹窗
    setShowInfographicStyleModal(false)
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'infographic',
      title: `生成${style}风格信息图...`,
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId,  // 保存文档ID
      style: style   // 保存风格
    }])
    
    console.log('开始生成信息图, docId:', docId, '风格:', style, '比例:', orientation, '详细程度:', detailLevel)
    
    // 生成缓存key（文档ID + 风格 + 比例 + 详细程度）
    const cacheKey = `${docId}_${style}_${orientation}_${detailLevel}`
    
    // 检查缓存
    if (infographicCache[cacheKey]) {
      console.log('使用缓存的信息图:', cacheKey)
      setInfoGraphicData(infographicCache[cacheKey])
      setShowInfoGraphicPanel(true)
      // 更新任务状态
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 信息图`, status: 'done' }
          : task
      ))
      return
    }
    
    setIsGeneratingInfoGraphic(true)
    setInfoGraphicData(null)
    setInfographicProgress('正在分析文档...')
    
    try {
      setInfographicProgress('正在生成信息图（约30秒）...')
      const response = await axios.post(`${API_BASE}/infographic/${docId}`, { style, orientation, detailLevel })
      console.log('信息图生成成功:', response.data)
      const newData = response.data.infographic || null
      setInfoGraphicData(newData)
      setInfographicProgress('')
      
      // 保存到缓存
      if (newData) {
        setInfographicCache(prev => ({ ...prev, [cacheKey]: newData }))
      }
      
      // 更新任务状态为完成，保存数据到任务
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 信息图`, status: 'done', data: newData }
          : task
      ))
      
      // 不自动打开弹窗，让用户点击任务查看
    } catch (error) {
      console.error('信息图生成失败:', error)
      setInfographicProgress('')
      // 更新任务状态为错误
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成信息图失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingInfoGraphic(false)
    }
  }
  
  // 生成音频概述
  const handleGenerateAudio = async (config) => {
    if (selectedDocs.length === 0) return
    
    const docId = selectedDocs[0]
    const doc = documents.find(d => d.id === docId)
    
    // 创建任务
    const taskId = `audio_${Date.now()}`
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'audio',
      title: '生成音频概述......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    setShowAudioConfigModal(false)
    setIsGeneratingAudio(true)
    
    try {
      const response = await axios.post(`${API_BASE}/audio-overview/${docId}`, {
        format_type: config.formatType,
        length: config.length,
        focus: config.focus
      })
      
      const { audio_id, title, dialogues } = response.data
      
      // 更新任务状态
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: title, status: 'done', audioId: audio_id }
          : task
      ))
      
      // 自动开始播放，保存对话脚本
      setCurrentAudio({ audioId: audio_id, title })
      setAudioDialogues(dialogues || [])
      
    } catch (error) {
      console.error('音频生成失败:', error)
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成音频失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  // 生成演示文稿（在工作室任务列表中显示进度）
  const handleGeneratePresentation = async () => {
    if (selectedDocs.length === 0) {
      toast.warning('请先选择文档')
      return
    }
    
    const docId = selectedDocs[0]
    const doc = documents.find(d => d.id === docId)
    if (!doc) return
    
    const taskId = `presentation_${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'presentation',
      title: '生成演示文稿......',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId
    }])
    
    try {
      // 1. 创建项目
      const createRes = await axios.post(`${API_BASE}/presentation/projects/${docId}`, {
        theme: 'daktilo',
        image_source: 'pexels'
      })
      const projectId = createRes.data.project_id
      
      // 2. 生成大纲
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成大纲中...' }
          : task
      ))
      
      await axios.post(`${API_BASE}/presentation/projects/${projectId}/outline`, {
        num_slides: 8
      })
      
      // 3. 生成幻灯片
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成幻灯片中...' }
          : task
      ))
      
      await axios.post(`${API_BASE}/presentation/projects/${projectId}/slides`)
      
      // 更新任务状态为完成
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${doc?.name || '文档'} 演示文稿`, status: 'done', projectId: projectId }
          : task
      ))
      
      // 自动打开编辑器
      setPptEditorDocId(docId)
      setPptEditorDocName(doc.name)
      setShowPPTEditor(true)
      
    } catch (error) {
      console.error('演示文稿生成失败:', error)
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成演示文稿失败了，试试别的。', status: 'error' }
          : task
      ))
    }
  }

  // 生成报告
  const handleGenerateReport = async (config) => {
    if (selectedDocs.length === 0) return
    
    const doc = documents.find(d => d.id === selectedDocs[0])
    if (!doc) return
    
    const docId = doc.id
    const taskId = `report_${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'report',
      title: '生成报告中...',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId,
      formatType: config.formatType
    }])
    
    setShowReportConfigModal(false)
    setIsGeneratingReport(true)
    
    try {
      const response = await axios.post(`${API_BASE}/report/${docId}`, {
        format_type: config.formatType,
        custom_description: config.customDescription
      })
      
      const { content, title } = response.data
      
      // 更新任务状态
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: title, status: 'done', data: { content } }
          : task
      ))
      
      // 自动打开报告面板
      setReportContent(content)
      setReportTitle(title)
      setShowReportPanel(true)
      
    } catch (error) {
      console.error('报告生成失败:', error)
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成报告失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // 生成幻灯片
  const handleGenerateSlides = async (config) => {
    if (selectedDocs.length === 0) return
    
    const doc = documents.find(d => d.id === selectedDocs[0])
    if (!doc) return
    
    const docId = doc.id
    const taskId = `slides_${Date.now()}`
    
    // 添加任务到列表
    setStudioTasks(prev => [...prev, {
      id: taskId,
      type: 'slides',
      title: '生成幻灯片中...',
      status: 'loading',
      createdAt: new Date(),
      docName: doc?.name || '文档',
      docId: docId,
      style: config.style
    }])
    
    setShowSlidesConfigModal(false)
    setIsGeneratingSlides(true)
    
    try {
      const response = await axios.post(`${API_BASE}/slides/${docId}`, {
        style: config.style,
        slide_count: config.slideCount
      })
      
      const { slides, title, style } = response.data
      
      // 更新任务状态
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: `${title} - 幻灯片`, status: 'done', data: { slides, style } }
          : task
      ))
      
      // 自动打开幻灯片面板
      setSlidesData(slides)
      setSlidesTitle(title)
      setSlidesStyle(style)
      setSlidesDocId(docId)
      setShowSlidesPanel(true)
      
    } catch (error) {
      console.error('幻灯片生成失败:', error)
      setStudioTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, title: '生成幻灯片失败了，试试别的。', status: 'error' }
          : task
      ))
    } finally {
      setIsGeneratingSlides(false)
    }
  }
  
  // 计算时间差
  const getTimeAgo = (date) => {
    if (!date) return '刚刚'
    const now = new Date()
    const taskDate = new Date(date)
    if (isNaN(taskDate.getTime())) return '刚刚'
    const diff = Math.floor((now - taskDate) / 1000)
    if (diff < 0 || isNaN(diff)) return '刚刚'
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    return `${Math.floor(diff / 86400)}天前`
  }
  
  // 点击任务打开对应面板，并从缓存加载内容
  const handleTaskClick = (task) => {
    if (task.status !== 'done') return
    const taskId = task.id
    
    switch (task.type) {
      case 'flashcard':
        if (studioCache.flashcards[taskId]) {
          setFlashcards(studioCache.flashcards[taskId])
        }
        setShowFlashcardPanel(true)
        break
      case 'quiz':
        if (studioCache.quiz[taskId]) {
          setQuizQuestions(studioCache.quiz[taskId])
        }
        setShowQuizPanel(true)
        break
      case 'mindmap':
        if (studioCache.mindmap[taskId]) {
          setMindmapContent(studioCache.mindmap[taskId])
        }
        setShowMindmapPanel(true)
        break
      case 'summary':
        if (studioCache.summary[taskId]) {
          setSummary(studioCache.summary[taskId])
        }
        setShowSummaryPanel(true)
        break
      case 'outline':
        if (studioCache.outline[taskId]) {
          setOutline(studioCache.outline[taskId])
        }
        setShowOutlinePanel(true)
        break
      case 'infographic':
        // 从任务数据加载信息图
        if (task.data) {
          setInfoGraphicData(task.data)
        }
        setShowInfoGraphicPanel(true)
        break
      case 'audio':
        // 播放音频并加载对话脚本
        if (task.audioId) {
          setCurrentAudio({ audioId: task.audioId, title: task.title })
          // 从后端加载对话脚本
          axios.get(`${API_BASE}/audio/${task.audioId}/dialogues`)
            .then(res => setAudioDialogues(res.data.dialogues || []))
            .catch(() => setAudioDialogues([]))
        }
        break
      case 'report':
        // 打开报告面板
        if (task.data?.content) {
          setReportContent(task.data.content)
          setReportTitle(task.title)
          setShowReportPanel(true)
        }
        break
      case 'slides':
        // 打开幻灯片面板
        if (task.data?.slides) {
          setSlidesData(task.data.slides)
          setSlidesTitle(task.title)
          setSlidesStyle(task.data.style || 'business')
          setSlidesDocId(task.docId)
          setShowSlidesPanel(true)
        }
        break
      case 'presentation':
        // 打开演示文稿编辑器，直接显示预览
        if (task.docId) {
          const doc = documents.find(d => d.id === task.docId)
          if (doc) {
            setPptEditorDocId(task.docId)
            setPptEditorDocName(doc.name)
            setPptEditorProjectId(task.projectId)  // 传递 projectId 以加载已生成的内容
            setShowPPTEditor(true)
          }
        }
        break
      case 'video-overview':
        // 如果任务完成且有视频，加载该任务的数据并打开播放器
        if (task.status === 'done' && task.videoUrl) {
          // 加载该任务的概述数据
          if (task.overviewData) {
            setVideoOverviewData(task.overviewData)
          }
          setCurrentVideoUrl(task.videoUrl)
          setCurrentVideoTitle(task.title)
          setShowVideoPlayerModal(true)
        }
        break
    }
  }
  
  // 获取任务图标
  const getTaskIcon = (type, status) => {
    const iconClass = status === 'loading' ? 'animate-spin' : ''
    switch (type) {
      case 'flashcard':
        return status === 'loading' 
          ? <RefreshCw className={`w-5 h-5 text-yellow-500 ${iconClass}`} />
          : <Layers className="w-5 h-5 text-yellow-500" />
      case 'quiz':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-teal-500 ${iconClass}`} />
          : <HelpCircle className="w-5 h-5 text-teal-500" />
      case 'mindmap':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-blue-500 ${iconClass}`} />
          : <Network className="w-5 h-5 text-blue-500" />
      case 'summary':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-orange-500 ${iconClass}`} />
          : <BookOpen className="w-5 h-5 text-orange-500" />
      case 'outline':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-cyan-500 ${iconClass}`} />
          : <List className="w-5 h-5 text-cyan-500" />
      case 'infographic':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-pink-500 ${iconClass}`} />
          : <Image className="w-5 h-5 text-pink-500" />
      case 'audio':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-purple-500 ${iconClass}`} />
          : <Mic className="w-5 h-5 text-purple-500" />
      case 'report':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-rose-500 ${iconClass}`} />
          : <FileBarChart className="w-5 h-5 text-rose-500" />
      case 'slides':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-indigo-500 ${iconClass}`} />
          : <Presentation className="w-5 h-5 text-indigo-500" />
      case 'presentation':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-indigo-500 ${iconClass}`} />
          : <Presentation className="w-5 h-5 text-indigo-500" />
      case 'video-overview':
        return status === 'loading'
          ? <RefreshCw className={`w-5 h-5 text-green-500 ${iconClass}`} />
          : <Video className="w-5 h-5 text-green-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  // 开始重命名任务
  const startRenameTask = (taskId) => {
    const task = studioTasks.find(t => t.id === taskId)
    if (!task) return
    setEditingTaskId(taskId)
    setEditingTaskTitle(task.title)
    setTaskMenuOpen(null)
  }
  
  // 保存重命名
  const saveRenameTask = () => {
    if (editingTaskId && editingTaskTitle.trim()) {
      setStudioTasks(prev => prev.map(t => 
        t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t
      ))
    }
    setEditingTaskId(null)
    setEditingTaskTitle('')
  }
  
  // 取消重命名
  const cancelRenameTask = () => {
    setEditingTaskId(null)
    setEditingTaskTitle('')
  }
  
  // 确认删除任务
  const confirmDeleteTask = (taskId) => {
    setDeleteConfirmId(taskId)
    setTaskMenuOpen(null)
  }
  
  // 执行删除任务
  const handleDeleteTask = (taskId) => {
    setStudioTasks(prev => prev.filter(t => t.id !== taskId))
    deleteTaskFromBackend(taskId) // 同步删除到后端
    setDeleteConfirmId(null)
  }

  // 开始重命名文档
  const startRenameDoc = (docId) => {
    const doc = documents.find(d => d.id === docId)
    if (!doc) return
    setEditingDocId(docId)
    setEditingDocName(doc.name)
    setDocMenuOpen(null)
  }
  
  // 保存文档重命名
  const saveRenameDoc = async () => {
    if (editingDocId && editingDocName.trim()) {
      // 更新本地状态
      setDocuments(prev => prev.map(d => 
        d.id === editingDocId ? { ...d, name: editingDocName.trim() } : d
      ))
      // TODO: 可以添加后端API来持久化重命名
    }
    setEditingDocId(null)
    setEditingDocName('')
  }
  
  // 取消文档重命名
  const cancelRenameDoc = () => {
    setEditingDocId(null)
    setEditingDocName('')
  }
  
  // 确认删除文档
  const confirmDeleteDoc = (docId) => {
    setDeleteDocConfirmId(docId)
    setDocMenuOpen(null)
  }
  
  // 执行删除文档
  const executeDeleteDoc = async () => {
    if (deleteDocConfirmId) {
      await handleDeleteDocument(deleteDocConfirmId)
      setDeleteDocConfirmId(null)
    }
  }

  const toggleDocSelection = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId))
    } else {
      setSelectedDocs([...selectedDocs, docId])
    }
  }

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />
      case 'word': return <File className="w-5 h-5 text-blue-500" />
      case 'audio': return <FileAudio className="w-5 h-5 text-purple-500" />
      case 'excel': return <FileBarChart className="w-5 h-5 text-green-500" />
      default: return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  // 打开 Excel 预览
  const openExcelPreview = (docId) => {
    setAudioPreview({ show: false, docId: null, content: '' })  // 关闭音频预览
    setPdfPreview({ show: false, docId: null, page: 1 })  // 关闭 PDF 预览
    setWebPreview({ show: false, docId: null })  // 关闭网页预览
    setWordPreview({ show: false, docId: null })  // 关闭 Word 预览
    setExcelPreview({ show: true, docId })
  }

  // 打开网页预览
  const openWebPreview = (docId) => {
    setAudioPreview({ show: false, docId: null, content: '' })  // 关闭音频预览
    setPdfPreview({ show: false, docId: null, page: 1 })  // 关闭 PDF 预览
    setExcelPreview({ show: false, docId: null })  // 关闭 Excel 预览
    setWordPreview({ show: false, docId: null })  // 关闭 Word 预览
    setWebPreview({ show: true, docId })
  }

  // 打开 Word 预览
  const openWordPreview = (docId) => {
    setAudioPreview({ show: false, docId: null, content: '' })  // 关闭音频预览
    setPdfPreview({ show: false, docId: null, page: 1 })  // 关闭 PDF 预览
    setExcelPreview({ show: false, docId: null })  // 关闭 Excel 预览
    setWebPreview({ show: false, docId: null })  // 关闭网页预览
    setWordPreview({ show: true, docId })
  }

  // 打开 PDF 预览
  const openPdfPreview = (docId, page = 1) => {
    setAudioPreview({ show: false, docId: null, content: '' })  // 关闭音频预览
    setPdfPreview({ show: true, docId, page })
  }

  // 关闭 PDF 预览
  const closePdfPreview = () => {
    setPdfPreview({ show: false, docId: null, page: 1 })
  }

  // 打开音频文本预览
  const openAudioPreview = async (doc, timestamp = null) => {
    setPdfPreview({ show: false, docId: null, page: 1 })  // 关闭 PDF 预览
    setAudioPreview({ show: true, docId: doc.id, content: '加载中...', timestamp })
    try {
      const response = await axios.get(`${API_BASE}/documents/${doc.id}/content`)
      setAudioPreview({ show: true, docId: doc.id, content: response.data.content || '暂无转录内容', timestamp })
    } catch (error) {
      console.error('获取内容失败:', error)
      setAudioPreview({ show: true, docId: doc.id, content: doc.content_preview || '获取内容失败', timestamp })
    }
  }

  // 跳转到音频时间戳
  const jumpToAudioTimestamp = async (docName, timestamp) => {
    const doc = documents.find(d => d.type === 'audio' && d.name.includes(docName.replace('.mp3', '')))
    if (doc) {
      await openAudioPreview(doc, timestamp)
    } else {
      // 如果找不到匹配的文档，尝试找第一个音频文档
      const audioDoc = documents.find(d => d.type === 'audio')
      if (audioDoc) {
        await openAudioPreview(audioDoc, timestamp)
      }
    }
  }

  // 关闭音频文本预览
  const closeAudioPreview = () => {
    setAudioPreview({ show: false, docId: null, content: '', timestamp: null })
  }

  // 简单的消息渲染 - 直接处理文本
  // 当前文档上下文（用于跟踪【文档名】）
  const currentDocContextRef = useRef(null)
  
  const renderMessage = (content, citationMap = [], sources = []) => {
    if (typeof content !== 'string') return content
    
    console.log('renderMessage 接收到的 sources:', sources)
    
    // 重置引用计数器和文档上下文
    refCounterRef.current = 0
    currentDocContextRef.current = null
    
    // 按行分割
    return content.split('\n').map((line, lineIdx) => {
      if (!line.trim()) return <br key={lineIdx} />
      
      // 处理这一行的内容
      const processedLine = processLine(line, sources)
      return <div key={lineIdx} className="mb-1">{processedLine}</div>
    })
  }
  
  // 处理单行文本
  const processLine = (line, sources = []) => {
    // 检测【文档名】并更新当前文档上下文
    const docNameRegex = /【([^】]+)】/
    const docNameMatch = line.match(docNameRegex)
    
    // 保存这一行的文档上下文
    let lineDocContext = currentDocContextRef.current
    
    if (docNameMatch) {
      const docName = docNameMatch[1]
      console.log('检测到文档名:', docName)
      // 根据文档名查找文档（模糊匹配）
      const doc = documents.find(d => {
        const match = d.name.includes(docName) || docName.includes(d.name.replace(/\.[^.]+$/, ''))
        console.log(`匹配 ${d.name} 和 ${docName}:`, match)
        return match
      })
      if (doc) {
        console.log('找到文档:', doc.name)
        currentDocContextRef.current = doc
        lineDocContext = doc  // 这一行使用新的文档上下文
      } else {
        console.log('未找到匹配的文档')
      }
    }
    
    // 先处理引用标记 [1], [2], [3] 或 [1,2,3]
    const parts = []
    let key = 0
    
    // 用正则分割引用标记和普通文本
    // 支持 [1] 或 [1,2,3] 或 [1、2、3] 格式
    const citationRegex = /\[(\d+(?:[,、]\d+)*)\]/g
    let lastIndex = 0
    let match
    
    while ((match = citationRegex.exec(line)) !== null) {
      // 添加引用前的文本（处理加粗和页码）
      if (match.index > lastIndex) {
        parts.push(...processBoldAndPages(line.slice(lastIndex, match.index), key))
        key += 10
      }
      
      // 解析引用编号（可能是多个，用逗号或顿号分隔）
      const citationNums = match[1].split(/[,、]/).map(n => n.trim())
      
      // 为每个引用编号创建一个上标
      citationNums.forEach((citationNum, idx) => {
        const pageNum = parseInt(citationNum)
        
        console.log('处理引用:', citationNum, 'pageNum:', pageNum, 'lineDocContext:', lineDocContext?.name, 'sources:', sources)
        
        // 优先从 sources 中查找匹配的文档和页码
        let targetDoc = null
        let docId = null
        let docName = null
        let docType = null
        
        // 如果有【文档名】上下文，在 sources 中查找该文档的对应页码
        if (lineDocContext && sources.length > 0) {
          const source = sources.find(s => {
            const pageMatch = parseInt(s.page) === pageNum || s.page === pageNum
            const docMatch = s.doc_id === lineDocContext.id
            console.log('  检查source:', s.name, 'page:', s.page, 'pageMatch:', pageMatch, 'docMatch:', docMatch)
            return docMatch && pageMatch
          })
          if (source) {
            console.log('  ✓ 找到匹配的source (有上下文):', source.name, 'page:', source.page)
            docId = source.doc_id
            docName = source.name
            docType = lineDocContext.type
            targetDoc = lineDocContext
          }
        }
        
        // 如果没有找到，尝试从 sources 中查找任意匹配的页码
        if (!targetDoc && sources.length > 0) {
          const source = sources.find(s => {
            const pageMatch = parseInt(s.page) === pageNum || s.page === pageNum
            console.log('  检查source (无上下文):', s.name, 'page:', s.page, 'pageMatch:', pageMatch)
            return pageMatch
          })
          if (source) {
            console.log('  ✓ 找到匹配的source (无上下文):', source.name, 'page:', source.page)
            docId = source.doc_id
            docName = source.name
            const doc = documents.find(d => d.id === source.doc_id)
            docType = doc?.type
            targetDoc = doc
          }
        }
        
        // 最后回退到使用文档上下文或第一个选中的文档
        if (!targetDoc) {
          console.log('  使用回退方案')
          targetDoc = lineDocContext || (selectedDocs.length > 0 ? documents.find(d => d.id === selectedDocs[0]) : null)
          docId = targetDoc?.id
          docName = targetDoc?.name
          docType = targetDoc?.type
        }
        
        console.log('  最终使用文档:', docName, 'docId:', docId, 'page:', pageNum)
        
        parts.push(
          <sup 
            key={`cite-${key++}`}
            className="inline-flex items-center justify-center w-4 h-4 ml-0.5 top-0 text-[10px] font-bold text-blue-600 bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200 hover:text-blue-700 transition-colors"
            onClick={(e) => {
              if (docId && docType === 'pdf') {
                openPdfPreview(docId, pageNum)
                toast.success(`跳转到 ${docName} 第 ${pageNum} 页`)
              } else if (docId) {
                toast.info('当前文档不支持跳转')
              } else {
                toast.error('未选择文档')
              }
            }}
            onMouseEnter={(e) => {
              if (docId && docType === 'pdf') {
                handlePageHover(e, docId, pageNum)
              }
            }}
            onMouseLeave={handlePageLeave}
            title={docName ? `${docName} - 第${pageNum}页` : `查看引用来源 ${citationNum}`}
          >
            {citationNum}
          </sup>
        )
        
        // 如果不是最后一个，添加逗号
        if (idx < citationNums.length - 1) {
          parts.push(<span key={`comma-${key++}`} className="text-blue-600 text-[10px]">,</span>)
        }
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // 添加剩余文本
    if (lastIndex < line.length) {
      parts.push(...processBoldAndPages(line.slice(lastIndex), key))
    }
    
    return parts.length > 0 ? parts : line
  }
  
  // 处理加粗和页码链接
  const processBoldAndPages = (text, startKey = 0) => {
    const parts = []
    let key = startKey
    
    // 用正则分割加粗和普通文本
    const boldRegex = /\*\*([^*]+)\*\*/g
    let lastIndex = 0
    let match
    
    while ((match = boldRegex.exec(text)) !== null) {
      // 添加加粗前的普通文本
      if (match.index > lastIndex) {
        parts.push(...processPageLinks(text.slice(lastIndex, match.index), key))
        key += 10
      }
      // 添加加粗文本
      parts.push(
        <strong key={`bold-${key++}`} className="font-bold">
          {processPageLinks(match[1], key)}
        </strong>
      )
      key += 10
      lastIndex = match.index + match[0].length
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(...processPageLinks(text.slice(lastIndex), key))
    }
    
    return parts
  }
  
  // 根据文档名查找文档
  const findDocByName = (docName) => {
    // 精确匹配
    let doc = documents.find(d => d.name === docName)
    if (doc) return doc
    
    // 模糊匹配（去掉扩展名）
    const nameWithoutExt = docName.replace(/\.[^.]+$/, '')
    doc = documents.find(d => d.name.includes(nameWithoutExt) || nameWithoutExt.includes(d.name.replace(/\.[^.]+$/, '')))
    if (doc) return doc
    
    // 默认返回第一个 PDF
    return documents.find(d => d.type === 'pdf')
  }

  // 悬浮预览处理 - 添加延迟避免频繁加载
  const hoverTimerRef = useRef(null)
  
  const handlePageHover = (e, docId, pageNum) => {
    if (docId) {
      const rect = e.target.getBoundingClientRect()
      // 清除之前的定时器
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      // 延迟 300ms 后显示预览
      hoverTimerRef.current = setTimeout(() => {
        setHoverPreview({
          show: true,
          docId: docId,
          page: pageNum,
          x: rect.left,
          y: rect.bottom + 5
        })
      }, 300)
    }
  }

  const handlePageLeave = () => {
    // 清除显示定时器
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    // 延迟 1.5 秒后隐藏预览窗口，给用户时间移动鼠标到预览窗口上
    hoverTimerRef.current = setTimeout(() => {
      setHoverPreview(prev => ({ ...prev, show: false }))
    }, 1500)
  }

  const handlePreviewLeave = () => {
    // 清除定时器
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    // 立即隐藏预览窗口
    setHoverPreview(prev => ({ ...prev, show: false }))
  }

  // 引用计数器
  const refCounterRef = useRef(0)
  
  // 处理页码链接和时间戳 - 支持 (文档名:第X页)、第X页、(文档名.mp3:[MM:SS]) 格式
  const processPageLinks = (text, startKey = 0, resetCounter = false) => {
    if (resetCounter) refCounterRef.current = 0
    
    const parts = []
    // 匹配 (文档名:第X页) 或 (文档名：第X页) 格式
    const docPageRegex = /[（(]([^:：]+?\.(?:pdf|PDF))[：:]第(\d+)页[）)]/g
    // 匹配单独的 第X页 格式
    const simplePageRegex = /第(\d+)页/g
    // 匹配音频时间戳格式 (文档名.mp3:[MM:SS]) 或 (文档名.mp3：[MM:SS])
    const audioTimestampRegex = /[（(]([^:：]+?\.mp3)[：:]\[(\d{1,2}):(\d{2})\][）)]/g
    // 匹配单独的时间戳 [MM:SS] 或 [MM:SS-MM:SS]
    const simpleTimestampRegex = /\[(\d{1,2}):(\d{2})(?:-\d{1,2}:\d{2})?\]/g
    
    let lastIndex = 0
    let key = startKey
    let match
    
    // 合并所有匹配项并按位置排序
    const allMatches = []
    
    // 收集 PDF 页码匹配
    while ((match = docPageRegex.exec(text)) !== null) {
      allMatches.push({ type: 'docPage', match, index: match.index })
    }
    
    // 收集音频时间戳匹配
    while ((match = audioTimestampRegex.exec(text)) !== null) {
      allMatches.push({ type: 'audioTimestamp', match, index: match.index })
    }
    
    // 按位置排序
    allMatches.sort((a, b) => a.index - b.index)
    
    // 处理所有匹配
    for (const item of allMatches) {
      if (item.index > lastIndex) {
        // 处理匹配前的文本（可能包含简单格式）
        const beforeText = text.slice(lastIndex, item.index)
        parts.push(...processSimpleFormats(beforeText, key))
        key += 10
      }
      
      if (item.type === 'docPage') {
        const docName = item.match[1].trim()
        const pageNum = parseInt(item.match[2])
        const doc = findDocByName(docName)
        
        parts.push(
          <button
            key={`p-${key++}`}
            onClick={() => doc && openPdfPreview(doc.id, pageNum)}
            onMouseEnter={(e) => doc && handlePageHover(e, doc.id, pageNum)}
            onMouseLeave={handlePageLeave}
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 cursor-pointer font-medium mx-0.5 align-middle"
            title={`${docName} - 第${pageNum}页`}
          >
            {pageNum}
          </button>
        )
      } else if (item.type === 'audioTimestamp') {
        const docName = item.match[1].trim()
        const mins = parseInt(item.match[2])
        const secs = parseInt(item.match[3])
        const timestamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        
        parts.push(
          <button
            key={`a-${key++}`}
            onClick={() => jumpToAudioTimestamp(docName, timestamp)}
            className="inline-flex items-center justify-center h-5 px-1.5 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 cursor-pointer font-medium mx-0.5 align-middle"
            title={`${docName} - ${timestamp}`}
          >
            {timestamp}
          </button>
        )
      }
      
      lastIndex = item.index + item.match[0].length
    }
    
    // 处理剩余文本
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex)
      parts.push(...processSimpleFormats(remainingText, key))
    }
    
    return parts.length > 0 ? parts : [<span key={`t-${key}`}>{text}</span>]
  }
  
  // 处理简单格式（第X页、[MM:SS]、引用标记）
  const processSimpleFormats = (text, startKey) => {
    const parts = []
    let key = startKey
    
    // 合并简单页码、时间戳和引用标记的匹配
    const simplePageRegex = /第(\d+)页/g
    // 时间戳格式：[MM:SS] 或 (MM:SS)
    const simpleTimestampRegex = /[\[\(](\d{1,2}):(\d{2})(?:-\d{1,2}:\d{2})?[\]\)]/g
    // 匹配引用标记：(1), (2), [1], [2] 等，但排除时间戳格式
    const citationRegex = /[\(\uff08](\d{1,2})[\)\uff09]/g
    
    const matches = []
    let match
    
    while ((match = simplePageRegex.exec(text)) !== null) {
      matches.push({ type: 'page', match: [...match], index: match.index, length: match[0].length })
    }
    
    while ((match = simpleTimestampRegex.exec(text)) !== null) {
      matches.push({ type: 'timestamp', match: [...match], index: match.index, length: match[0].length })
    }
    
    while ((match = citationRegex.exec(text)) !== null) {
      // 检查是否是时间戳的一部分（如 [12:30] 中的 (30)）
      const beforeChar = text[match.index - 1]
      const afterChar = text[match.index + match[0].length]
      const isPartOfTimestamp = (beforeChar === ':' || afterChar === ':')
      
      // 检查是否匹配时间戳格式 (MM:SS)
      const timestampPattern = /^\((\d{1,2}):(\d{2})\)$/
      const isTimestamp = timestampPattern.test(match[0])
      
      if (!isPartOfTimestamp && !isTimestamp) {
        matches.push({ type: 'citation', match: [...match], index: match.index, length: match[0].length })
      }
    }
    
    matches.sort((a, b) => a.index - b.index)
    
    let lastIndex = 0
    for (const item of matches) {
      if (item.index > lastIndex) {
        parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex, item.index)}</span>)
      }
      
      if (item.type === 'page') {
        const pageNum = parseInt(item.match[1])
        const defaultDoc = documents.find(d => d.type === 'pdf')
        
        parts.push(
          <button
            key={`p-${key++}`}
            onClick={() => defaultDoc && openPdfPreview(defaultDoc.id, pageNum)}
            onMouseEnter={(e) => defaultDoc && handlePageHover(e, defaultDoc.id, pageNum)}
            onMouseLeave={handlePageLeave}
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 cursor-pointer font-medium mx-0.5 align-middle"
            title={`第${pageNum}页`}
          >
            {pageNum}
          </button>
        )
      } else if (item.type === 'timestamp') {
        const mins = parseInt(item.match[1])
        const secs = parseInt(item.match[2])
        const timestamp = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        const audioDoc = documents.find(d => d.type === 'audio')
        
        parts.push(
          <button
            key={`a-${key++}`}
            onClick={() => audioDoc && openAudioPreview(audioDoc, timestamp)}
            className="inline-flex items-center justify-center h-5 px-1.5 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 cursor-pointer font-medium mx-0.5 align-middle"
            title={`跳转到 ${timestamp}`}
          >
            {timestamp}
          </button>
        )
      } else if (item.type === 'citation') {
        const citationNum = parseInt(item.match[1])
        // 引用编号表示页码，使用当前文档上下文
        const pageNum = citationNum
        const doc = currentDocContextRef.current || (selectedDocs[0] ? documents.find(d => d.id === selectedDocs[0]) : null)
        console.log('引用点击 - 页码:', pageNum, '文档:', doc?.name)
        
        parts.push(
          <button
            key={`c-${key++}`}
            onClick={() => {
              if (doc) {
                // 根据文档类型打开相应的预览
                if (doc.type === 'pdf') {
                  openPdfPreview(doc.id, pageNum)
                } else if (doc.type === 'word') {
                  openWordPreview(doc.id)
                } else if (doc.type === 'excel') {
                  openExcelPreview(doc.id)
                } else if (doc.type === 'web' || doc.type === 'webpage') {
                  openWebPreview(doc.id)
                } else if (doc.type === 'audio') {
                  openAudioPreview(doc)
                }
              }
            }}
            onMouseEnter={(e) => {
              if (doc && doc.type === 'pdf') {
                handlePageHover(e, doc.id, pageNum)
              }
            }}
            onMouseLeave={handlePageLeave}
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 cursor-pointer font-medium mx-0.5 align-middle"
            title={doc ? `${doc.name} - 第${pageNum}页` : `第${pageNum}页`}
          >
            {citationNum}
          </button>
        )
      }
      
      lastIndex = item.index + item.length
    }
    
    if (lastIndex < text.length) {
      parts.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>)
    }
    
    return parts
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 全局音频元素 - 小播放器和全屏共享 */}
      {currentAudio && (
        <audio 
          ref={setupAudioRef} 
          src={`${API_BASE}/audio/${currentAudio.audioId}`} 
          preload="auto"
        />
      )}
      
      {/* 左侧边栏 - Sources 风格 */}
      <div 
        className="bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 relative"
        style={{ width: `${leftPanelWidth}px` }}
      >
        {/* 拖动条 */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
          onMouseDown={handleLeftResize}
        />
        {/* 标题 */}
        <div className="px-4 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">你的资源库</h2>
        </div>

        {/* 添加来源按钮 */}
        <div className="px-4 pt-3 pb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.doc,.docx,.xls,.xlsx,.pdf,.md,.epub,.mobi,.mp3,.wav,.m4a,.ogg,.flac"
            multiple
            className="hidden"
          />
          <button
            onClick={() => setShowAddSourceModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-white transition-colors text-sm"
          >
            <span className="text-lg">+</span>
            点我添加资源哦
          </button>
        </div>

        {/* 联网搜索组件 */}
        <div className="px-3 pb-3">
          <WebSearch onSearchComplete={fetchDocuments} />
        </div>

        {/* 全选区域 */}
        {documents.length > 0 && (
          <div className="px-2 py-2 border-b border-gray-200">
            <div 
              className="flex items-center justify-between cursor-pointer p-2"
              onClick={() => {
                // 只选择已完成处理的文档（排除上传中和转录中）
                const readyDocs = documents.filter(d => 
                  d.content_preview !== '正在转录音频...' && d.content_preview !== '__uploading__'
                )
                if (selectedDocs.length === readyDocs.length && readyDocs.length > 0) {
                  setSelectedDocs([])
                } else {
                  setSelectedDocs(readyDocs.map(d => d.id))
                }
              }}
            >
              <span className="text-sm text-gray-600">选择所有资源</span>
              {/* 勾选框在右边 */}
              <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                documents.filter(d => d.content_preview !== '正在转录音频...' && d.content_preview !== '__uploading__').length > 0 &&
                selectedDocs.length === documents.filter(d => d.content_preview !== '正在转录音频...' && d.content_preview !== '__uploading__').length
                  ? 'bg-indigo-600'
                  : 'border-2 border-gray-300 hover:border-gray-400'
              }`}>
                {documents.filter(d => d.content_preview !== '正在转录音频...' && d.content_preview !== '__uploading__').length > 0 &&
                 selectedDocs.length === documents.filter(d => d.content_preview !== '正在转录音频...' && d.content_preview !== '__uploading__').length && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 文档列表 */}
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">暂无资源</p>
              <p className="text-xs text-gray-400 mt-1">上传 PDF、Word 或音频文件</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {documents.map((doc) => {
                const isUploading = doc.content_preview === '__uploading__'
                const isTranscribing = doc.content_preview === '正在转录音频...'
                const isParsing = doc.parsing_status === 'processing'
                const isProcessing = isUploading || isTranscribing || isParsing
                return (
                  <div
                    key={doc.id}
                    className={`p-2 rounded-lg transition-all group ${
                      selectedDocs.includes(doc.id)
                        ? 'bg-white shadow-sm border border-gray-200 cursor-pointer'
                        : 'hover:bg-white hover:shadow-sm cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* 左侧三点菜单 */}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)
                          }}
                          className="mt-0.5 p-0.5 hover:bg-gray-200 rounded text-gray-400"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {docMenuOpen === doc.id && (
                          <div 
                            className="absolute left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[100px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => startRenameDoc(doc.id)}
                              className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              重命名
                            </button>
                            <button
                              onClick={() => confirmDeleteDoc(doc.id)}
                              className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          // 如果正在上传或编辑，不打开预览
                          if (editingDocId === doc.id || isProcessing) {
                            return
                          }
                          
                          if (doc.type === 'pdf') {
                            openPdfPreview(doc.id, 1)
                          } else if (doc.type === 'audio') {
                            openAudioPreview(doc)
                          } else if (doc.type === 'excel') {
                            openExcelPreview(doc.id)
                          } else if (doc.type === 'web' || doc.type === 'webpage') {
                            openWebPreview(doc.id)
                          } else if (doc.type === 'word') {
                            openWordPreview(doc.id)
                          }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {getFileIcon(doc.type)}
                          {editingDocId === doc.id ? (
                            <input
                              type="text"
                              value={editingDocName}
                              onChange={(e) => setEditingDocName(e.target.value)}
                              onBlur={saveRenameDoc}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRenameDoc()
                                if (e.key === 'Escape') cancelRenameDoc()
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="flex-1 text-sm font-medium text-gray-800 border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-sm font-medium text-gray-800 truncate hover:text-indigo-600">
                              {doc.name}
                            </p>
                          )}
                        </div>
                        {editingDocId !== doc.id && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {isUploading ? '正在上传...' : 
                             isTranscribing ? '正在转录音频...' : 
                             isParsing ? '正在解析文件...' : 
                             doc.parsing_status === 'error' ? '⚠️ 解析失败' :
                             doc.content_preview}
                          </p>
                        )}
                      </div>
                      {/* 右侧：转录中显示转圈，否则显示勾选框 */}
                      {isProcessing ? (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="3" />
                            <path className="opacity-75" fill="#6366f1" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      ) : (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDocSelection(doc.id)
                          }}
                          className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center cursor-pointer transition-colors ${
                            selectedDocs.includes(doc.id)
                              ? 'bg-indigo-600'
                              : 'border-2 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {selectedDocs.includes(doc.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 中间主区域 - Chat */}
      <div className="flex-1 flex flex-col bg-white border-l border-gray-200">
        {/* 标题栏 */}
        <div className="px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-800">NoteBooklm(青春版)</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                // 删除当前会话
                if (currentConversationId) {
                  try {
                    await axios.delete(`${API_BASE}/conversations/${currentConversationId}`)
                  } catch (error) {
                    console.error('删除会话失败:', error)
                  }
                }
                
                // 清空消息
                setMessages([])
                
                // 创建新会话
                try {
                  const response = await axios.post(`${API_BASE}/conversations`, {
                    title: '新对话'
                  })
                  setCurrentConversationId(response.data.id)
                  toast.success('已清空对话')
                } catch (error) {
                  console.error('创建新会话失败:', error)
                  toast.error('创建新会话失败')
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          </div>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>上传文档后，开始提问吧</p>
                <p className="text-sm mt-2">已选择 {selectedDocs.length} 个文档</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => {
                console.log('渲染消息:', idx, 'sources:', msg.sources)
                return (
                <div key={idx} className="message-fade-in">
                  {msg.role === 'user' ? (
                    // 用户消息 - 右侧气泡
                    <div className="flex justify-end">
                      <div className="max-w-[80%] px-4 py-2 bg-gray-100 rounded-full text-gray-800 text-sm">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    // AI 回复 - 左侧全宽
                    <div className="space-y-3">
                      <div className="text-sm leading-relaxed text-gray-800">
                        {renderMessage(msg.content, msg.citationMap || [], msg.sources || [])}
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={() => handleSaveNote(msg.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                          保存笔记
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content)
                            toast.success('已复制到剪贴板')
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-400"
                          title="复制"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* 联想问题 */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2" style={{ maxWidth: '320px' }}>
                          {msg.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(suggestion)}
                              className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">思考中...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="p-4">
          {/* 建议问题 - 点击自动发送 */}
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => handleSendMessage('文档的主要内容是什么？')}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                这个文档的主要内容是什么？
              </button>
              <button
                onClick={() => handleSendMessage('请总结文档的关键要点')}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                请总结文档的关键要点
              </button>
              <button
                onClick={() => handleSendMessage('有哪些重要的操作步骤？')}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                有哪些重要的操作步骤？
              </button>
            </div>
          )}
          
          {/* 输入框 */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2 border border-gray-200">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入问题..."
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
              disabled={isLoading || documents.length === 0}
            />
            <span className="text-xs text-gray-400">{selectedDocs.length} 个资源</span>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim() || documents.length === 0}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 右侧 Excel 预览面板 */}
      {excelPreview.show && (
        <div 
          className="bg-white border-l border-gray-200 flex flex-col relative"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* 拖动条 */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={handleRightResize}
          />
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              📆 {documents.find(d => d.id === excelPreview.docId)?.name || 'Excel 文件'}
            </h3>
            <button
              onClick={() => setExcelPreview({ show: false, docId: null })}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ExcelPreview 
              docId={excelPreview.docId}
              onClose={() => setExcelPreview({ show: false, docId: null })}
            />
          </div>
        </div>
      )}

      {/* 右侧 Word 预览面板 */}
      {wordPreview.show && <WordPreview docId={wordPreview.docId} onClose={() => setWordPreview({ show: false, docId: null })} />}

      {/* 右侧网页预览面板 */}
      {webPreview.show && <WebPreview docId={webPreview.docId} onClose={() => setWebPreview({ show: false, docId: null })} />}

      {/* 右侧 PDF 预览面板 */}
      {pdfPreview.show && (
        <div 
          className="bg-white border-l border-gray-200 flex flex-col relative"
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* 拖动条 */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={handleRightResize}
          />
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              📄 {documents.find(d => d.id === pdfPreview.docId)?.name || '文档'} - 第 {pdfPreview.page} 页
            </h3>
            <button
              onClick={closePdfPreview}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-gray-100">
            <iframe
              key={`pdf-${pdfPreview.docId}-${pdfPreview.page}`}
              src={`${API_BASE}/documents/${pdfPreview.docId}/file#page=${pdfPreview.page}&view=FitH`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* 右侧音频文本预览面板 */}
      {audioPreview.show && (
        <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">
              🎵 {documents.find(d => d.id === audioPreview.docId)?.name || '音频'} - 转录文本
              {audioPreview.timestamp && <span className="ml-2 text-purple-600">@ {audioPreview.timestamp}</span>}
            </h3>
            <button
              onClick={closeAudioPreview}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="text-sm text-gray-700 leading-relaxed space-y-1">
              {audioPreview.content ? audioPreview.content.split('\n').map((line, idx) => {
                const isHighlighted = audioPreview.timestamp && line.startsWith(`[${audioPreview.timestamp}]`)
                return (
                  <div 
                    key={idx} 
                    id={isHighlighted ? 'audio-highlight' : undefined}
                    className={`py-1 px-2 rounded ${isHighlighted ? 'bg-purple-100 border-l-4 border-purple-500' : ''}`}
                  >
                    {line}
                  </div>
                )
              }) : '暂无转录内容'}
            </div>
          </div>
        </div>
      )}

      {/* 悬浮预览窗口 - PDF 预览 */}
      {hoverPreview.show && !pdfPreview.show && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            left: Math.min(hoverPreview.x, window.innerWidth - 400),
            top: Math.min(hoverPreview.y, window.innerHeight - 450),
            width: '380px',
            height: '400px'
          }}
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
          }}
          onMouseLeave={handlePreviewLeave}
        >
          <div className="bg-gray-50 px-3 py-2 border-b text-xs text-gray-600 font-medium truncate">
            📄 {documents.find(d => d.id === hoverPreview.docId)?.name || '文档'} - 第 {hoverPreview.page} 页
          </div>
          <iframe
            src={`${API_BASE}/documents/${hoverPreview.docId}/file#page=${hoverPreview.page}&view=FitH`}
            className="w-full h-[340px]"
            title="Hover Preview"
          />
        </div>
      )}

      {/* 右侧 Studio 面板 - 与各种预览互斥 */}
      {showStudio && !pdfPreview.show && !audioPreview.show && !excelPreview.show && !webPreview.show && !wordPreview.show && (
        <div 
          className="bg-gray-50 border-l border-gray-200 flex flex-col relative overflow-hidden"
          style={{ width: `${studioWidth}px` }}
        >
          {/* 拖动条 */}
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={handleStudioResize}
          />
          {/* Studio 标题 */}
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">工作室</h2>
          </div>

          {/* 功能网格 */}
          <div className="px-4 pt-3">
            <div className="grid grid-cols-3 gap-3">
              {/* 文档摘要 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 如果已有摘要，直接打开
                    if (summary) {
                      setShowSummaryPanel(true)
                    } else if (!isLoading) {
                      // 否则开始生成（不自动打开）
                      handleGenerateSummary(selectedDocs[0])
                    }
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <BookOpen className="w-5 h-5 text-orange-600 mb-1" />
                <span className="text-xs text-gray-700">摘要</span>
              </button>

              {/* 文档大纲 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 如果已有大纲，直接打开
                    if (outline) {
                      setShowOutlinePanel(true)
                    } else if (!isLoading) {
                      // 否则开始生成（不自动打开）
                      handleGenerateOutline(selectedDocs[0])
                    }
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
              >
                <List className="w-5 h-5 text-cyan-600 mb-1" />
                <span className="text-xs text-gray-700">大纲</span>
              </button>

              {/* 音频概述 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    setShowAudioConfigModal(true)
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                disabled={isGeneratingAudio}
                className="flex flex-col items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Mic className={`w-5 h-5 text-purple-600 mb-1 ${isGeneratingAudio ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-700">音频概述</span>
              </button>

              {/* 视频概述 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    setShowVideoConfigModal(true)
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                disabled={isGeneratingVideoOverview || isGeneratingVideo}
                className="flex flex-col items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Video className={`w-5 h-5 text-green-600 mb-1 ${(isGeneratingVideoOverview || isGeneratingVideo) ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-700">视频概述</span>
              </button>

              {/* 思维导图 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 始终创建新任务
                    if (!isGeneratingMindmap) {
                      handleGenerateMindmap(selectedDocs[0])
                    }
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Network className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xs text-gray-700">思维导图</span>
              </button>

              {/* 报告 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    setShowReportConfigModal(true)
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <FileBarChart className="w-5 h-5 text-rose-600 mb-1" />
                <span className="text-xs text-gray-700">报告</span>
              </button>

              {/* 闪卡 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 始终创建新任务
                    if (!isGeneratingFlashcards) {
                      handleGenerateFlashcards(selectedDocs[0])
                    }
                  } else {
                    toast.warning('请先选择一个文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <Layers className="w-5 h-5 text-yellow-600 mb-1" />
                <span className="text-xs text-gray-700">闪卡</span>
              </button>

              {/* 测验 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 始终创建新任务
                    if (!isGeneratingQuiz) {
                      handleGenerateQuiz(selectedDocs[0])
                    }
                  } else {
                    toast.warning('请先选择一个文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-teal-600 mb-1" />
                <span className="text-xs text-gray-700">测验</span>
              </button>

              {/* Infographic */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    // 始终打开风格选择弹窗，创建新任务
                    if (!isGeneratingInfoGraphic) {
                      setShowInfographicStyleModal(true)
                    }
                  } else {
                    toast.warning('请先选择一个文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
              >
                <Image className="w-5 h-5 text-pink-600 mb-1" />
                <span className="text-xs text-gray-700">信息图</span>
              </button>

              {/* 幻灯片 - 使用 Presentation AI 编辑器 */}
              <button 
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    const doc = documents.find(d => d.id === selectedDocs[0])
                    if (doc) {
                      setPptEditorDocId(doc.id)
                      setPptEditorDocName(doc.name)
                      setPptEditorProjectId(null)  // 新建，不是加载已有项目
                      setShowPPTEditor(true)
                    }
                  } else {
                    toast.warning('请先选择文档')
                  }
                }}
                className="flex flex-col items-center p-3 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-lg transition-colors"
              >
                <Presentation className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-gray-700">演示文稿</span>
              </button>

            </div>
          </div>

          {/* 任务列表区域 */}
          <div className="flex-1 overflow-y-auto p-4 border-t border-gray-200 space-y-2">
            {/* 笔记列表 */}
            {notes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">笔记</h3>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setCurrentNote(note)
                      setShowNoteEditor(true)
                    }}
                    className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors mb-2"
                  >
                    <StickyNote className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{note.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(note.createdAt).toLocaleString('zh-CN', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* 任务列表 - 按时间倒序排列 */}
            {studioTasks.length > 0 && <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1">任务</h3>}
            {[...studioTasks].sort((a, b) => b.createdAt - a.createdAt).map((task) => (
              <div 
                key={task.id} 
                onClick={() => handleTaskClick(task)}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  task.status === 'error' ? 'border-red-200 bg-red-50' :
                  task.status === 'done' ? 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer' : 
                  'border-gray-200 bg-gray-50'
                } transition-colors group`}
              >
                <div className="flex-shrink-0">
                  {task.status === 'error' 
                    ? <AlertCircle className="w-5 h-5 text-red-500" />
                    : getTaskIcon(task.type, task.status)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {editingTaskId === task.id ? (
                    // 编辑模式
                    <input
                      type="text"
                      value={editingTaskTitle}
                      onChange={(e) => setEditingTaskTitle(e.target.value)}
                      onBlur={saveRenameTask}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRenameTask()
                        if (e.key === 'Escape') cancelRenameTask()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-full text-sm font-medium text-gray-800 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    // 显示模式
                    <p className={`text-sm font-medium truncate ${
                      task.status === 'error' ? 'text-red-600' :
                      task.status === 'loading' ? 'text-gray-500' : 'text-gray-800'
                    }`}>
                      {task.title}
                    </p>
                  )}
                  {task.status !== 'error' && editingTaskId !== task.id && (
                    <p className="text-xs text-gray-400">
                      {task.status === 'loading' 
                        ? (task.subtitle || '基于1个来源') 
                        : `1个来源 · ${getTimeAgo(task.createdAt)}`}
                    </p>
                  )}
                </div>
                {/* 错误状态显示删除按钮 */}
                {task.status === 'error' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTask(task.id)
                    }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    删除
                  </button>
                )}
                {/* 完成状态显示更多菜单 */}
                {task.status === 'done' && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setTaskMenuOpen(taskMenuOpen === task.id ? null : task.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    {/* 下拉菜单 */}
                    {taskMenuOpen === task.id && (
                      <div 
                        className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => startRenameTask(task.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil className="w-4 h-4" />
                          重命名
                        </button>
                        <button
                          onClick={() => confirmDeleteTask(task.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 底部区域：音频播放器 */}
          {currentAudio && (
            <div className="border-t border-gray-200">
              <div className="p-3 bg-amber-50">
                <div className="flex items-center gap-3">
                  {/* 标题 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {currentAudio.title}
                    </div>
                  </div>
                  
                  {/* 播放控制 - 使用内联播放器 */}
                  <StudioAudioPlayer 
                    audioRef={globalAudioRef}
                    isPlaying={audioPlaying}
                    currentTime={audioCurrentTime}
                    duration={audioDuration}
                    onTogglePlay={toggleAudioPlay}
                    onSeek={seekAudio}
                    onClose={() => setCurrentAudio(null)} 
                    onExpand={() => setIsAudioFullscreen(true)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 笔记编辑器覆盖层 */}
          <div 
            className={`absolute inset-0 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
              showNoteEditor && currentNote ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNoteEditor(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-base font-semibold text-gray-800">笔记</h2>
                </div>
              </div>
              {/* 显示创建时间 */}
              {currentNote && (
                <p className="text-sm text-gray-500 mt-2 ml-9">
                  📝 创建于 {new Date(currentNote.createdAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {currentNote ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {currentNote.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>暂无笔记内容</p>
                </div>
              )}
            </div>

            {/* 底部 - 删除按钮 */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (currentNote) {
                    setNotes(prev => prev.filter(n => n.id !== currentNote.id))
                    setShowNoteEditor(false)
                    setCurrentNote(null)
                    toast.success('笔记已删除')
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除笔记
              </button>
            </div>
          </div>

          {/* 文档摘要覆盖层 */}
          <div 
            className={`absolute inset-0 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
              showSummaryPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSummaryPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  <h2 className="text-base font-semibold text-gray-800">文档摘要</h2>
                </div>
              </div>
              {/* 显示文档名称 */}
              {selectedDocs.length > 0 && (
                <p className="text-sm text-gray-500 mt-2 ml-9 truncate">
                  📄 {documents.find(d => d.id === selectedDocs[0])?.name || '未知文档'}
                </p>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading && !summary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  <span className="ml-2 text-gray-500">正在生成摘要...</span>
                </div>
              ) : summary ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>暂无摘要内容</p>
                </div>
              )}
            </div>

            {/* 底部 - 重新生成按钮 */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    handleGenerateSummary(selectedDocs[0], true) // regenerate=true
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '生成中...' : '重新生成'}
              </button>
            </div>
          </div>

          {/* 文档大纲覆盖层 */}
          <div 
            className={`absolute inset-0 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
              showOutlinePanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowOutlinePanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-base font-semibold text-gray-800">文档大纲</h2>
                </div>
              </div>
              {/* 显示文档名称 */}
              {selectedDocs.length > 0 && (
                <p className="text-sm text-gray-500 mt-2 ml-9 truncate">
                  📄 {documents.find(d => d.id === selectedDocs[0])?.name || '未知文档'}
                </p>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading && !outline ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                  <span className="ml-2 text-gray-500">正在生成大纲...</span>
                </div>
              ) : outline ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{outline}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <List className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>暂无大纲内容</p>
                </div>
              )}
            </div>

            {/* 底部 - 重新生成按钮 */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    setShowOutlinePanel(false) // 退出到主页面
                    handleGenerateOutline(selectedDocs[0])
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '生成中...' : '重新生成'}
              </button>
            </div>
          </div>

          {/* 视频概述覆盖层 */}
          {showVideoOverviewPanel && videoOverviewData && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              {/* 背景遮罩 */}
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowVideoOverviewPanel(false)}
              />
              
              {/* 内容区域 */}
              <div className="relative z-10 w-[85vw] max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* 顶部标题栏 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-green-600" />
                    <h3 className="text-lg font-medium">视频概述</h3>
                  </div>
                  <button
                    onClick={() => setShowVideoOverviewPanel(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* 内容区域 - 可滚动，不显示加载状态 */}
                <div className="p-5 max-h-[80vh] overflow-y-auto">
                  {videoOverviewData?.outline ? (
                    <div className="space-y-6">
                      {videoOverviewData.outline.map((section, idx) => (
                        <div key={idx} className="group relative bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {section.section_index || idx + 1}
                            </span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800">{section.title}</h3>
                              <p className="text-sm text-gray-500 mt-1">{section.summary}</p>
                              {section.narration && (
                                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{section.narration}</p>
                              )}
                            </div>
                          </div>
                          {/* 图片 */}
                          {section.image_url && (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mt-3">
                              <img
                                src={section.image_url}
                                alt={section.title}
                                className="w-full rounded-lg border border-gray-200"
                              />
                              {/* 视频预览按钮 */}
                              {studioTasks.find(t => t.type === 'video-overview' && t.videoUrl)?.videoUrl && (
                                <button
                                  onClick={() => {
                                    const videoTask = studioTasks.find(t => t.type === 'video-overview' && t.videoUrl)
                                    setCurrentVideoUrl(videoTask.videoUrl)
                                    setCurrentVideoTitle(videoTask.title)
                                    setShowVideoPlayerModal(true)
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="预览视频"
                                >
                                  <Video className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <p>暂无视频概述</p>
                    </div>
                  )}
                </div>

                {/* 底部按钮 */}
                <div className="p-5 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (selectedDocs.length > 0) {
                        setShowVideoOverviewPanel(false)
                        setVideoOverviewData(null)
                        setShowVideoConfigModal(true)
                      }
                    }}
                    disabled={isGeneratingVideoOverview || isGeneratingVideo}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${(isGeneratingVideoOverview || isGeneratingVideo) ? 'animate-spin' : ''}`} />
                    {(isGeneratingVideoOverview || isGeneratingVideo) ? '生成中...' : '重新生成'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 报告覆盖层 */}
          <div 
            className={`absolute inset-0 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
              showReportPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReportPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-rose-600" />
                  <h2 className="text-base font-semibold text-gray-800">报告</h2>
                </div>
              </div>
              {/* 显示报告标题 */}
              <p className="text-sm text-gray-500 mt-2 ml-9 truncate">
                📄 {reportTitle || '未知报告'}
              </p>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {isGeneratingReport && !reportContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                  <span className="ml-2 text-gray-500">正在生成报告...</span>
                </div>
              ) : reportContent ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>暂无报告内容</p>
                </div>
              )}
            </div>

            {/* 底部 - 复制按钮 */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (reportContent) {
                    navigator.clipboard.writeText(reportContent)
                    toast.success('已复制到剪贴板')
                  }
                }}
                disabled={!reportContent}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
              >
                复制内容
              </button>
            </div>
          </div>

          {/* 思维导图覆盖层 */}
          {/* 全屏遮罩 */}
          {isMindmapFullscreen && showMindmapPanel && (
            <div 
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsMindmapFullscreen(false)}
            />
          )}
          <div 
            className={`${isMindmapFullscreen ? 'fixed inset-8 z-50 rounded-3xl shadow-2xl' : 'absolute inset-0'} bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
              showMindmapPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 - 全屏时隐藏 */}
            {!isMindmapFullscreen && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMindmapPanel(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base font-semibold text-gray-800">思维导图</h2>
                  </div>
                </div>
                {/* 显示文档名称 */}
                {selectedDocs.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2 ml-9 truncate">
                    📄 {documents.find(d => d.id === selectedDocs[0])?.name || '未知文档'}
                  </p>
                )}
              </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 overflow-auto bg-gray-50">
              {isGeneratingMindmap ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">正在生成思维导图...</span>
                </div>
              ) : mindmapContent ? (
                <div className="flex items-center justify-center p-4 h-full">
                  <img 
                    src={`${API_BASE}${mindmapContent}`}
                    alt="思维导图"
                    className="max-w-full max-h-full object-contain"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Network className="w-10 h-10 mb-3 opacity-50" />
                  <p>暂无思维导图内容</p>
                </div>
              )}
            </div>

            {/* 底部 - 全屏时隐藏 */}
            {!isMindmapFullscreen && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocs.length > 0) {
                      setShowMindmapPanel(false) // 退出到主页面
                      handleGenerateMindmap(selectedDocs[0])
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm"
                >
                  <Network className="w-4 h-4" />
                  重新生成
                </button>
              </div>
            )}
          </div>

          {/* 闪卡覆盖层 */}
          {/* 全屏遮罩 */}
          {isFlashcardFullscreen && showFlashcardPanel && (
            <div 
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsFlashcardFullscreen(false)}
            />
          )}
          <div 
            className={`${isFlashcardFullscreen ? 'fixed inset-8 z-50 rounded-3xl shadow-2xl' : 'absolute inset-0'} bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
              showFlashcardPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (isFlashcardFullscreen) {
                      setIsFlashcardFullscreen(false)
                    } else {
                      setShowFlashcardPanel(false)
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <Layers className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <h2 className="text-base font-semibold text-gray-800 flex-shrink-0">闪卡</h2>
                {/* 文档名称紧跟标题 */}
                {selectedDocs.length > 0 && (
                  <span className="text-sm text-gray-500 truncate">
                    {documents.find(d => d.id === selectedDocs[0])?.name}
                  </span>
                )}
              </div>
              {/* 全屏按钮 */}
              <button
                onClick={() => setIsFlashcardFullscreen(!isFlashcardFullscreen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title={isFlashcardFullscreen ? "退出全屏" : "全屏"}
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden">
              {isGeneratingFlashcards ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-600" />
                  <span className="ml-2 text-gray-500">正在生成闪卡...</span>
                </div>
              ) : (
                <FlashcardView 
                  flashcards={flashcards}
                  isFullscreen={isFlashcardFullscreen}
                  onToggleFullscreen={() => setIsFlashcardFullscreen(!isFlashcardFullscreen)}
                  onExplain={async (question, answer) => {
                    // 关闭闪卡面板，自动发送到对话
                    setShowFlashcardPanel(false)
                    setIsFlashcardFullscreen(false)
                    const explainMessage = `我正在复习基于原始资料的抽认卡，想扩展对其中一个的理解。\n\n封面上写着："${question}"\n背面的答案是："${answer}"\n\n请更详细地解释这个话题。`
                    // 自动发送
                    setMessages(prev => [...prev, { role: 'user', content: explainMessage }])
                    setIsLoading(true)
                    try {
                      const response = await axios.post(`${API_BASE}/chat`, {
                        message: explainMessage,
                        doc_ids: selectedDocs
                      })
                      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }])
                    } catch (error) {
                      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，解释生成失败，请重试。' }])
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                />
              )}
            </div>

            {/* 底部 - 全屏时隐藏 */}
            {!isFlashcardFullscreen && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocs.length > 0) {
                      setShowFlashcardPanel(false) // 退出到主页面
                      handleGenerateFlashcards(selectedDocs[0])
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors text-sm"
                >
                  <Layers className="w-4 h-4" />
                  重新生成
                </button>
              </div>
            )}
          </div>

          {/* 测验覆盖层 */}
          {/* 全屏遮罩 */}
          {isQuizFullscreen && showQuizPanel && (
            <div 
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setIsQuizFullscreen(false)}
            />
          )}
          <div 
            className={`${isQuizFullscreen ? 'fixed inset-8 z-50 rounded-3xl shadow-2xl' : 'absolute inset-0'} bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
              showQuizPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (isQuizFullscreen) {
                      setIsQuizFullscreen(false)
                    } else {
                      setShowQuizPanel(false)
                    }
                  }}
                  className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <HelpCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <h2 className="text-base font-semibold text-gray-800 flex-shrink-0">测验</h2>
                {selectedDocs.length > 0 && (
                  <span className="text-sm text-gray-500 truncate">
                    {documents.find(d => d.id === selectedDocs[0])?.name}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsQuizFullscreen(!isQuizFullscreen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title={isQuizFullscreen ? "退出全屏" : "全屏"}
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden">
              {isGeneratingQuiz ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                  <span className="ml-2 text-gray-500">正在生成测验...</span>
                </div>
              ) : (
                <QuizView 
                  quiz={quizQuestions}
                  onExplain={async (question, options, answer, explanation) => {
                    setShowQuizPanel(false)
                    setIsQuizFullscreen(false)
                    const optionsText = Object.entries(options).map(([k, v]) => `${k}. ${v}`).join('\n')
                    const explainMessage = `我正在做一个测验题，想更深入地理解这道题。\n\n题目：${question}\n\n选项：\n${optionsText}\n\n正确答案：${answer}\n解释：${explanation}\n\n请更详细地解释这道题涉及的知识点。`
                    setMessages(prev => [...prev, { role: 'user', content: explainMessage }])
                    setIsLoading(true)
                    try {
                      const response = await axios.post(`${API_BASE}/chat`, {
                        message: explainMessage,
                        doc_ids: selectedDocs
                      })
                      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }])
                    } catch (error) {
                      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，解释生成失败，请重试。' }])
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                />
              )}
            </div>

            {/* 底部 - 全屏时隐藏 */}
            {!isQuizFullscreen && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (selectedDocs.length > 0) {
                      setShowQuizPanel(false) // 退出到主页面
                      handleGenerateQuiz(selectedDocs[0])
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors text-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  重新生成
                </button>
              </div>
            )}
          </div>

          {/* 音频概述全屏面板 */}
          {isAudioFullscreen && currentAudio && (
            <FullscreenAudioPanel 
              audioId={currentAudio.audioId}
              title={currentAudio.title}
              isPlaying={audioPlaying}
              currentTime={audioCurrentTime}
              duration={audioDuration}
              dialogues={audioDialogues}
              onTogglePlay={toggleAudioPlay}
              onSeek={seekAudio}
              onReset={resetAudio}
              onClose={() => setIsAudioFullscreen(false)}
            />
          )}

          {/* 信息图弹窗 - 自适应图片大小 */}
          {showInfoGraphicPanel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* 背景遮罩 */}
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowInfoGraphicPanel(false)}
              />
              
              {/* 内容区域 - 自适应大小 */}
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
                {/* 标题栏 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-pink-600" />
                    <h2 className="text-base font-semibold text-gray-800">信息图</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 重新生成按钮 */}
                    <button
                      onClick={() => {
                        if (selectedDocs.length > 0) {
                          setShowInfoGraphicPanel(false)
                          setShowInfographicStyleModal(true)
                        }
                      }}
                      disabled={isGeneratingInfoGraphic}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重新生成
                    </button>
                    {/* 导出按钮 */}
                    <button
                      onClick={async () => {
                        if (infographicData?.imageUrl) {
                          try {
                            // 通过 fetch 下载图片
                            const proxyUrl = `http://localhost:8000/proxy-image?url=${encodeURIComponent(infographicData.imageUrl)}`
                            const response = await fetch(proxyUrl)
                            const blob = await response.blob()
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement('a')
                            link.href = url
                            link.download = `信息图_${new Date().toLocaleDateString('zh-CN')}.png`
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(url)
                          } catch (error) {
                            console.error('导出失败:', error)
                            toast.error('导出失败，请重试')
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      导出 PNG
                    </button>
                    {/* 关闭按钮 */}
                    <button
                      onClick={() => setShowInfoGraphicPanel(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="overflow-auto">
                  {infographicData?.imageUrl ? (
                    <img 
                      id="infographic-image"
                      src={`http://localhost:8000/proxy-image?url=${encodeURIComponent(infographicData.imageUrl)}`}
                      alt="信息图"
                      className="max-w-[90vw] max-h-[85vh] object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 px-20 text-gray-400">
                      暂无信息图
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 音频转录覆盖层 */}
          <div 
            className={`absolute inset-0 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
              showAudioPanel ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* 标题栏 */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAudioPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-semibold text-gray-800">音频转录</h2>
                </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-4">
              {isTranscribing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
                  <span className="text-gray-500">正在转录音频...</span>
                  <span className="text-xs text-gray-400 mt-1">这可能需要几分钟</span>
                </div>
              ) : audioTranscript ? (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {audioTranscript}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Mic className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>点击上方按钮上传音频文件</p>
                  <p className="text-xs mt-2">支持 MP3、WAV、M4A、OGG、FLAC 格式</p>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors text-sm"
              >
                <Mic className="w-4 h-4" />
                上传新音频
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sources 弹窗 */}
      {showAddSourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[700px] max-h-[80vh] overflow-hidden shadow-2xl">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">添加资源</h2>
                <p className="text-sm text-gray-500 mt-1">
                  上传文档让 AI 基于这些内容回答你的问题
                </p>
              </div>
              <button
                onClick={() => setShowAddSourceModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 上传区域 */}
            <div className="p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50')
                  const files = e.dataTransfer.files
                  if (files.length > 0) {
                    // 触发文件上传
                    const event = { target: { files } }
                    handleFileUpload(event)
                    setShowAddSourceModal(false)
                  }
                }}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">上传资源</h3>
                <p className="text-sm text-gray-500 mb-4">
                  拖拽文件到这里，或 <span className="text-indigo-600 hover:underline">点击选择文件</span>（支持多选）
                </p>
                <p className="text-xs text-gray-400">
                  支持的文件类型: TXT, DOC, DOCX, XLS, XLSX, PDF, MD, EPUB, MOBI，以及音频文件 (MP3, WAV, M4A, OGG, FLAC)
                </p>
              </div>

              {/* 其他来源选项 */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {/* 网页链接 */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="font-medium text-gray-700">链接</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAddSourceModal(false)
                      setShowURLInputModal(true)
                    }}
                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                  >
                    网页
                  </button>
                </div>

                {/* 粘贴文本 */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-gray-700">粘贴文本</span>
                  </div>
                  <button 
                    onClick={() => setShowPasteTextModal(true)}
                    className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                  >
                    粘贴内容
                  </button>
                </div>

                {/* 更多选项 */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                    <span className="font-medium text-gray-700">更多</span>
                  </div>
                  <span className="text-xs text-gray-400">即将推出</span>
                </div>
              </div>
            </div>

            {/* 底部 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>已上传 {documents.length} / 50 个资源</span>
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 text-indigo-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">上传中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteConfirmId(null)}
          />
          {/* 弹窗内容 */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="text-center text-gray-800 font-medium mb-6">
              确定删除此项目？
            </h3>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirmId)}
                className="px-6 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除文档确认弹窗 */}
      {deleteDocConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteDocConfirmId(null)}
          />
          {/* 弹窗内容 */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-80">
            <h3 className="text-center text-gray-800 font-medium mb-6">
              确定删除此文档？
            </h3>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteDocConfirmId(null)}
                className="px-6 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeDeleteDoc}
                className="px-6 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 信息图风格选择弹窗 */}
      <InfographicStyleModal
        isOpen={showInfographicStyleModal}
        onClose={() => setShowInfographicStyleModal(false)}
        onGenerate={(style) => {
          if (selectedDocs.length > 0) {
            handleGenerateInfoGraphic(selectedDocs[0], style)
          }
        }}
      />

      {/* 音频配置弹窗 */}
      <AudioConfigModal
        isOpen={showAudioConfigModal}
        onClose={() => setShowAudioConfigModal(false)}
        onGenerate={handleGenerateAudio}
        isGenerating={isGeneratingAudio}
      />

      {/* 报告配置弹窗 */}
      {showReportConfigModal && (
        <ReportConfigModal
          onClose={() => setShowReportConfigModal(false)}
          onGenerate={handleGenerateReport}
        />
      )}

      {/* 幻灯片配置弹窗 */}
      {showSlidesConfigModal && (
        <SlidesConfigModal
          onClose={() => setShowSlidesConfigModal(false)}
          onGenerate={handleGenerateSlides}
        />
      )}

      {/* 视频配置弹窗 */}
      {showVideoConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[420px] max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-800">视频概述设置</h2>
                </div>
                <button
                  onClick={() => setShowVideoConfigModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-5">
              {/* 长度选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">视频长度</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVideoLength('short')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      videoLength === 'short'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">简短</div>
                    <div className="text-xs text-gray-500 mt-1">5 个章节，约 2-3 分钟</div>
                  </button>
                  <button
                    onClick={() => setVideoLength('default')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      videoLength === 'default'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">默认</div>
                    <div className="text-xs text-gray-500 mt-1">8 个章节，约 5-6 分钟</div>
                  </button>
                </div>
              </div>
              
              {/* 风格选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">视频风格</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVideoStyle('cartoon')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      videoStyle === 'cartoon'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">🎨</div>
                    <div className="text-sm font-medium text-gray-800">动画卡通</div>
                    <div className="text-xs text-gray-500">可爱插画风格</div>
                  </button>
                  <button
                    onClick={() => setVideoStyle('documentary')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      videoStyle === 'documentary'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">🎬</div>
                    <div className="text-sm font-medium text-gray-800">纪录片</div>
                    <div className="text-xs text-gray-500">专业真实感</div>
                  </button>
                  <button
                    onClick={() => setVideoStyle('narrative')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      videoStyle === 'narrative'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">📖</div>
                    <div className="text-sm font-medium text-gray-800">叙事风格</div>
                    <div className="text-xs text-gray-500">故事化讲述</div>
                  </button>
                  <button
                    onClick={() => setVideoStyle('short')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      videoStyle === 'short'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">📱</div>
                    <div className="text-sm font-medium text-gray-800">短视频</div>
                    <div className="text-xs text-gray-500">快节奏抓眼球</div>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => {
                  if (selectedDocs.length > 0) {
                    handleGenerateVideoOverview(selectedDocs[0], videoLength, videoStyle)
                  }
                }}
                disabled={isGeneratingVideoOverview || isGeneratingVideo}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(isGeneratingVideoOverview || isGeneratingVideo) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    生成视频
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 视频播放器弹窗 - 类似思维导图放大样式 */}
      {showVideoPlayerModal && currentVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowVideoPlayerModal(false)
              setCurrentVideoUrl(null)
              setCurrentVideoTitle('')
            }}
          />
          
          {/* 内容区域 */}
          <div className="relative z-10 w-[80vw] max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-800">
                <Video className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium truncate max-w-md">{currentVideoTitle || '视频概述'}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 视频概述按钮 */}
                {videoOverviewData && (
                  <button
                    onClick={() => setShowVideoOverviewPanel(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 text-sm rounded-lg transition-colors"
                  >
                    <List className="w-3.5 h-3.5" />
                    视频概述
                  </button>
                )}
                {/* 下载按钮 */}
                <button
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = currentVideoUrl
                    link.download = `${currentVideoTitle || 'video'}.mp4`
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载
                </button>
                {/* 关闭按钮 */}
                <button
                  onClick={() => {
                    setShowVideoPlayerModal(false)
                    setCurrentVideoUrl(null)
                    setCurrentVideoTitle('')
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* 视频播放器 */}
            <div className="p-4 bg-gray-100">
              <video
                src={currentVideoUrl}
                controls
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: '70vh' }}
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          </div>
        </div>
      )}

      {/* 幻灯片面板 */}
      {showSlidesPanel && slidesData.length > 0 && (
        <SlidesView
          slides={slidesData}
          title={slidesTitle}
          style={slidesStyle}
          docId={slidesDocId}
          onClose={() => setShowSlidesPanel(false)}
        />
      )}

      {/* Presentation AI 编辑器 */}
      {showPPTEditor && pptEditorDocId && (
        <PresentationEditor
          docId={pptEditorDocId}
          docName={pptEditorDocName}
          existingProjectId={pptEditorProjectId}
          onClose={() => {
            setShowPPTEditor(false)
            setPptEditorDocId(null)
            setPptEditorDocName('')
            setPptEditorProjectId(null)
          }}
          onStartGenerating={async ({ docId, docName, title, slideCount, projectId, outline }) => {
            // 在工作室任务列表添加生成任务
            const taskId = `presentation_${Date.now()}`
            setStudioTasks(prev => [...prev, {
              id: taskId,
              type: 'presentation',
              title: `生成幻灯片中...`,
              status: 'loading',
              createdAt: new Date(),
              docName: docName,
              docId: docId
            }])
            
            // 在后台执行生成逻辑
            try {
              // 调用后端生成幻灯片
              await axios.post(`${API_BASE}/presentation/projects/${projectId}/slides`)
              
              // 更新任务状态为完成
              setStudioTasks(prev => prev.map(task => 
                task.id === taskId 
                  ? { ...task, title: `${title || docName} 演示文稿`, status: 'done', projectId }
                  : task
              ))
              
            } catch (error) {
              console.error('生成幻灯片失败:', error)
              setStudioTasks(prev => prev.map(task => 
                task.id === taskId 
                  ? { ...task, title: '生成演示文稿失败了，试试别的。', status: 'error' }
                  : task
              ))
            }
          }}
        />
      )}

      {/* URL 输入弹窗 */}
      <URLInputModal
        isOpen={showURLInputModal}
        onClose={() => setShowURLInputModal(false)}
        onSubmit={handleURLSubmit}
      />

      {/* 粘贴文本弹窗 */}
      <PasteTextModal
        isOpen={showPasteTextModal}
        onClose={() => setShowPasteTextModal(false)}
        onSubmit={handlePasteTextSubmit}
      />

    </div>
  )
}

// 用 ToastProvider 包裹 App
const AppWithToast = () => (
  <ToastProvider>
    <App />
  </ToastProvider>
)

export default AppWithToast
