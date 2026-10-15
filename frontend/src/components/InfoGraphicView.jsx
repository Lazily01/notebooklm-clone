import React, { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { 
  Download, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Upload,
  MousePointer,
  FileCheck,
  Send,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Lightbulb,
  Target,
  ArrowRight
} from 'lucide-react'

const InfoGraphicView = ({ data, onExport }) => {
  const containerRef = useRef(null)

  // 导出为PNG
  const handleExport = async () => {
    const element = document.getElementById('infographic-content')
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      })
      
      const link = document.createElement('a')
      link.download = `信息图_${new Date().toLocaleDateString('zh-CN')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>暂无信息图内容</p>
      </div>
    )
  }

  // 根据类型渲染不同的信息图
  const renderInfoGraphic = () => {
    switch (data.type) {
      case 'template_for_style':
        return <TemplateForStyleTransfer data={data} />
      case 'hybrid':
        return <HybridInfoGraphic data={data} />
      case 'template':
        return <TemplateInfoGraphic data={data} />
      case 'svg':
        return <SvgInfoGraphic data={data} />
      case 'image':
        return <ImageInfoGraphic data={data} />
      case 'process':
        return <ProcessInfoGraphic data={data} />
      case 'research':
        return <ResearchInfoGraphic data={data} />
      case 'report':
        return <ReportInfoGraphic data={data} />
      case 'concept':
        return <ConceptInfoGraphic data={data} />
      default:
        return <TemplateForStyleTransfer data={data} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex justify-end p-3 border-b border-gray-100">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          导出 PNG
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-2"
      >
        <div id="infographic-content" className="h-full">
          {renderInfoGraphic()}
        </div>
      </div>
    </div>
  )
}

// SVG 信息图（LLM 直接生成 SVG 代码）
const SvgInfoGraphic = ({ data }) => {
  return (
    <div className="flex flex-col items-center p-4">
      {data.svgCode && (
        <div 
          className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: data.svgCode }}
        />
      )}
    </div>
  )
}

// 模板信息图（数据 + 生成的图标）
const TemplateInfoGraphic = ({ data }) => {
  const info = data.data || {}
  const style = info.style || '商务简约'
  
  // 根据风格选择配色（支持关键词匹配）
  const getStyleColors = () => {
    const s = style.toLowerCase()
    
    // 赛博朋克风格
    if (s.includes('赛博') || s.includes('朋克') || s.includes('cyber') || s.includes('neon') || s.includes('霓虹')) {
      return {
        bg: 'from-gray-900 via-purple-900 to-gray-900',
        card: 'bg-gray-800/80 border-purple-500/30',
        title: 'from-pink-400 to-cyan-400',
        text: 'text-gray-100',
        subtext: 'text-gray-400',
        accent: 'from-pink-500 to-purple-600',
        stepBg: 'bg-gradient-to-br from-pink-600 to-purple-700'
      }
    }
    
    // 可爱/卡通风格（包括海绵宝宝等）
    if (s.includes('可爱') || s.includes('卡通') || s.includes('海绵') || s.includes('萌') || s.includes('cute') || s.includes('kawaii')) {
      return {
        bg: 'from-yellow-100 via-amber-50 to-orange-100',
        card: 'bg-white/90 border-yellow-300',
        title: 'from-yellow-500 to-orange-500',
        text: 'text-gray-800',
        subtext: 'text-gray-600',
        accent: 'from-yellow-400 to-orange-400',
        stepBg: 'bg-gradient-to-br from-yellow-400 to-orange-500'
      }
    }
    
    // 科技/未来风格
    if (s.includes('科技') || s.includes('未来') || s.includes('tech') || s.includes('future') || s.includes('科幻')) {
      return {
        bg: 'from-slate-900 via-blue-900 to-slate-900',
        card: 'bg-slate-800/80 border-cyan-500/30',
        title: 'from-cyan-400 to-blue-400',
        text: 'text-gray-100',
        subtext: 'text-gray-400',
        accent: 'from-cyan-500 to-blue-600',
        stepBg: 'bg-gradient-to-br from-cyan-500 to-blue-600'
      }
    }
    
    // 自然/清新风格
    if (s.includes('自然') || s.includes('清新') || s.includes('绿色') || s.includes('环保') || s.includes('nature')) {
      return {
        bg: 'from-green-50 via-emerald-50 to-teal-50',
        card: 'bg-white/90 border-green-200',
        title: 'from-green-600 to-emerald-600',
        text: 'text-gray-800',
        subtext: 'text-gray-500',
        accent: 'from-green-500 to-emerald-500',
        stepBg: 'bg-gradient-to-br from-green-500 to-emerald-600'
      }
    }
    
    // 粉色/少女风格
    if (s.includes('粉') || s.includes('少女') || s.includes('pink') || s.includes('girl')) {
      return {
        bg: 'from-pink-100 via-rose-50 to-pink-100',
        card: 'bg-white/90 border-pink-200',
        title: 'from-pink-500 to-rose-500',
        text: 'text-gray-800',
        subtext: 'text-gray-500',
        accent: 'from-pink-400 to-rose-400',
        stepBg: 'bg-gradient-to-br from-pink-400 to-rose-500'
      }
    }
    
    // 暗黑/深色风格
    if (s.includes('暗黑') || s.includes('深色') || s.includes('dark') || s.includes('黑色')) {
      return {
        bg: 'from-gray-900 via-gray-800 to-gray-900',
        card: 'bg-gray-700/80 border-gray-600',
        title: 'from-gray-200 to-white',
        text: 'text-gray-100',
        subtext: 'text-gray-400',
        accent: 'from-gray-500 to-gray-600',
        stepBg: 'bg-gradient-to-br from-gray-600 to-gray-700'
      }
    }
    
    // 默认：商务简约
    return {
      bg: 'from-slate-50 via-blue-50 to-indigo-100',
      card: 'bg-white/90 border-gray-200',
      title: 'from-blue-600 to-indigo-600',
      text: 'text-gray-800',
      subtext: 'text-gray-500',
      accent: 'from-blue-500 to-indigo-600',
      stepBg: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    }
  }
  
  const colors = getStyleColors()
  
  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-3xl p-8 min-h-[700px]`}>
      {/* 标题区域 */}
      <div className="text-center mb-10">
        <h1 className={`text-3xl font-bold bg-gradient-to-r ${colors.title} bg-clip-text text-transparent mb-3`}>
          {info.title || '信息图'}
        </h1>
        {info.subtitle && (
          <p className={colors.subtext}>{info.subtitle}</p>
        )}
      </div>

      {/* 关键要点 */}
      {info.keyPoints && info.keyPoints.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[80px]" />
            <h2 className={`text-sm font-semibold ${colors.subtext} uppercase tracking-widest`}>重要提示</h2>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[80px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {info.keyPoints.map((point, idx) => (
              <div key={idx} className={`${colors.card} backdrop-blur rounded-2xl p-5 border shadow-lg`}>
                <div className="flex items-center gap-3 mb-3">
                  {point.icon_url ? (
                    <img src={point.icon_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.accent} flex items-center justify-center text-white font-bold`}>
                      {idx + 1}
                    </div>
                  )}
                  <h3 className={`font-bold ${colors.text}`}>{point.title}</h3>
                </div>
                <p className={`text-sm ${colors.subtext}`}>{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 步骤流程 */}
      {info.steps && info.steps.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[80px]" />
            <h2 className={`text-sm font-semibold ${colors.subtext} uppercase tracking-widest`}>操作流程</h2>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[80px]" />
          </div>
          
          <div className="flex flex-wrap justify-center items-start gap-4">
            {info.steps.map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`w-40 ${colors.card} backdrop-blur rounded-2xl overflow-hidden border shadow-lg`}>
                  {/* 图标区域 */}
                  <div className={`h-24 ${colors.stepBg} flex items-center justify-center`}>
                    {step.icon_url ? (
                      <img src={step.icon_url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    ) : (
                      <span className="text-4xl font-bold text-white/80">{step.number}</span>
                    )}
                  </div>
                  {/* 文字区域 */}
                  <div className="p-4 text-center">
                    <h3 className={`font-bold ${colors.text} text-sm mb-1`}>
                      {step.number}. {step.title}
                    </h3>
                    <p className={`text-xs ${colors.subtext}`}>{step.desc}</p>
                  </div>
                </div>
                {/* 箭头 */}
                {idx < info.steps.length - 1 && (
                  <div className={`mx-2 ${colors.subtext}`}>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结论 */}
      {info.conclusion && (
        <div className={`${colors.card} backdrop-blur rounded-2xl p-5 border shadow-lg text-center`}>
          <p className={colors.text}>{info.conclusion}</p>
        </div>
      )}
    </div>
  )
}

// 模板 + 风格迁移信息图
const TemplateForStyleTransfer = ({ data }) => {
  const templateRef = useRef(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [styledImageUrl, setStyledImageUrl] = useState(null)

  const info = data.data || {}
  const style = data.style || '商务简约'

  // 获取代理URL
  const getProxyUrl = (url) => {
    if (!url) return ''
    return `http://localhost:8000/proxy-image?url=${encodeURIComponent(url)}`
  }

  // 执行风格迁移
  const handleStyleTransfer = async () => {
    if (!templateRef.current) return

    setIsTransferring(true)
    try {
      // 1. 截图模板
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      })
      
      // 2. 转为base64
      const base64 = canvas.toDataURL('image/png').split(',')[1]
      
      // 3. 调用风格迁移API
      const response = await fetch('http://localhost:8000/style-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, style })
      })
      
      if (response.ok) {
        const result = await response.json()
        setStyledImageUrl(result.imageUrl)
      } else {
        alert('风格迁移失败，请重试')
      }
    } catch (error) {
      console.error('风格迁移失败:', error)
      alert('风格迁移失败')
    } finally {
      setIsTransferring(false)
    }
  }

  // 如果已经有风格化的图片，显示它
  if (styledImageUrl) {
    return (
      <div className="flex flex-col items-center">
        <img 
          src={getProxyUrl(styledImageUrl)} 
          alt="风格化信息图"
          className="w-full max-w-4xl rounded-2xl shadow-lg"
        />
        <button
          onClick={() => setStyledImageUrl(null)}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          重新生成
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* 基础模板 */}
      <div 
        ref={templateRef}
        className="w-full max-w-4xl bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg"
        style={{ aspectRatio: '16/9' }}
      >
        {/* 标题 */}
        <h1 className="font-heiti text-3xl font-bold text-center text-blue-900 mb-4">
          {info.title || '信息图'}
        </h1>

        {/* 关键要点 */}
        {info.keyPoints && info.keyPoints.length > 0 && (
          <div className="flex justify-center gap-4 mb-4">
            {info.keyPoints.slice(0, 3).map((point, idx) => (
              <div key={idx} className="bg-white/90 rounded-xl p-3 shadow-md flex-1 max-w-[180px] text-center border border-blue-200">
                <h3 className="font-heiti text-blue-700 text-sm font-bold">{point.title}</h3>
                <p className="font-heiti text-gray-600 text-xs mt-1">{point.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* 步骤流程 */}
        {info.steps && info.steps.length > 0 && (
          <div className="flex items-center justify-center gap-2 my-4">
            {info.steps.slice(0, 5).map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className="bg-white/90 rounded-xl p-3 shadow-md w-[120px] text-center border border-blue-200">
                  <div className="font-heiti text-blue-600 text-xl font-bold">{idx + 1}</div>
                  <h4 className="font-heiti text-blue-700 text-xs font-bold">{step.title}</h4>
                  <p className="font-heiti text-gray-600 text-xs mt-1">{step.desc}</p>
                </div>
                {idx < info.steps.length - 1 && idx < 4 && (
                  <ArrowRight className="w-5 h-5 mx-1 text-blue-500" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 总结 */}
        {info.conclusion && (
          <div className="bg-blue-600 text-white rounded-xl p-3 text-center mt-4 shadow-md">
            <p className="font-heiti text-sm font-medium">{info.conclusion}</p>
          </div>
        )}
      </div>

      {/* 风格迁移按钮 */}
      <button
        onClick={handleStyleTransfer}
        disabled={isTransferring}
        className={`mt-4 px-6 py-3 rounded-lg font-medium text-white transition-all ${
          isTransferring 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg'
        }`}
      >
        {isTransferring ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            正在进行 {style} 风格迁移...
          </span>
        ) : (
          `🎨 应用 ${style} 风格`
        )}
      </button>
      
      <p className="text-gray-500 text-sm mt-2">
        点击按钮，AI将把上面的模板转换为 {style} 风格
      </p>
    </div>
  )
}

// 混合渲染信息图（豆包装饰背景 + 前端固定布局文字）
const HybridInfoGraphic = ({ data }) => {
  const getProxyUrl = (url) => {
    if (!url) return ''
    return `http://localhost:8000/proxy-image?url=${encodeURIComponent(url)}`
  }

  const info = data.data || {}
  const style = data.style || '商务简约'

  // 根据风格获取样式
  const getStyles = () => {
    const styleKey = style.toLowerCase()
    
    if (styleKey.includes('赛博') || styleKey.includes('朋克') || styleKey.includes('科技') || styleKey.includes('未来')) {
      return {
        title: 'font-art text-cyan-300 text-2xl font-black drop-shadow-[0_0_20px_rgba(0,255,255,0.9)]',
        keyCard: 'bg-black/80 backdrop-blur border-2 border-cyan-500/50 rounded-xl',
        keyTitle: 'font-heiti text-pink-400 text-sm font-bold',
        keyDesc: 'font-heiti text-cyan-200 text-xs',
        stepCard: 'bg-black/80 backdrop-blur border-2 border-pink-500/50 rounded-xl',
        stepNum: 'font-art text-cyan-400 text-lg font-bold',
        stepTitle: 'font-heiti text-pink-300 text-xs font-bold',
        stepDesc: 'font-heiti text-white/80 text-xs',
        conclusion: 'font-heiti text-cyan-300 text-sm bg-black/70 backdrop-blur rounded-xl border border-cyan-500/50',
        arrow: 'text-cyan-400'
      }
    }
    
    if (styleKey.includes('海绵宝宝') || styleKey.includes('卡通') || styleKey.includes('可爱')) {
      return {
        title: 'font-cute text-yellow-500 text-2xl font-bold drop-shadow-[2px_2px_0_#000]',
        keyCard: 'bg-white/90 backdrop-blur border-3 border-yellow-400 rounded-2xl shadow-lg',
        keyTitle: 'font-cute text-blue-600 text-sm font-bold',
        keyDesc: 'font-heiti text-gray-700 text-xs',
        stepCard: 'bg-white/90 backdrop-blur border-3 border-orange-400 rounded-2xl shadow-lg',
        stepNum: 'font-cute text-orange-500 text-lg font-bold',
        stepTitle: 'font-cute text-blue-600 text-xs font-bold',
        stepDesc: 'font-heiti text-gray-600 text-xs',
        conclusion: 'font-cute text-blue-700 text-sm bg-white/90 backdrop-blur rounded-2xl border-2 border-yellow-400',
        arrow: 'text-orange-500'
      }
    }
    
    if (styleKey.includes('自然') || styleKey.includes('清新')) {
      return {
        title: 'font-brush text-green-800 text-2xl',
        keyCard: 'bg-white/85 backdrop-blur border border-green-300 rounded-xl shadow-md',
        keyTitle: 'font-heiti text-green-700 text-sm font-bold',
        keyDesc: 'font-heiti text-gray-600 text-xs',
        stepCard: 'bg-white/85 backdrop-blur border border-green-300 rounded-xl shadow-md',
        stepNum: 'font-brush text-green-600 text-lg',
        stepTitle: 'font-heiti text-green-700 text-xs font-bold',
        stepDesc: 'font-heiti text-gray-600 text-xs',
        conclusion: 'font-heiti text-green-800 text-sm bg-white/85 backdrop-blur rounded-xl border border-green-300',
        arrow: 'text-green-500'
      }
    }
    
    // 默认商务风格
    return {
      title: 'font-heiti text-blue-900 text-2xl font-black',
      keyCard: 'bg-white/90 backdrop-blur border border-blue-200 rounded-xl shadow-md',
      keyTitle: 'font-heiti text-blue-700 text-sm font-bold',
      keyDesc: 'font-heiti text-gray-600 text-xs',
      stepCard: 'bg-white/90 backdrop-blur border border-blue-200 rounded-xl shadow-md',
      stepNum: 'font-heiti text-blue-600 text-lg font-bold',
      stepTitle: 'font-heiti text-blue-700 text-xs font-bold',
      stepDesc: 'font-heiti text-gray-600 text-xs',
      conclusion: 'font-heiti text-blue-800 text-sm bg-white/90 backdrop-blur rounded-xl border border-blue-200',
      arrow: 'text-blue-500'
    }
  }

  const s = getStyles()

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      {/* 装饰背景图 */}
      {data.backgroundUrl && (
        <img 
          src={getProxyUrl(data.backgroundUrl)} 
          alt="背景"
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        />
      )}
      
      {/* 固定布局的内容层 */}
      <div className="absolute inset-0 flex flex-col p-4">
        {/* 标题区域 */}
        <div className="text-center mb-3">
          <h1 className={s.title}>{info.title || '信息图'}</h1>
        </div>

        {/* 关键要点区域 */}
        {info.keyPoints && info.keyPoints.length > 0 && (
          <div className="flex justify-center gap-3 mb-3">
            {info.keyPoints.slice(0, 3).map((point, idx) => (
              <div key={idx} className={`${s.keyCard} p-2 flex-1 max-w-[160px] text-center`}>
                <h3 className={s.keyTitle}>{point.title}</h3>
                <p className={`${s.keyDesc} mt-1`}>{point.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* 步骤流程区域 */}
        {info.steps && info.steps.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1">
              {info.steps.slice(0, 5).map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`${s.stepCard} p-2 w-[100px] text-center`}>
                    <div className={s.stepNum}>{idx + 1}</div>
                    <h4 className={s.stepTitle}>{step.title}</h4>
                    <p className={`${s.stepDesc} mt-1`}>{step.desc}</p>
                  </div>
                  {idx < info.steps.length - 1 && idx < 4 && (
                    <ArrowRight className={`w-5 h-5 mx-1 ${s.arrow}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 总结区域 */}
        {info.conclusion && (
          <div className={`${s.conclusion} p-2 text-center mt-auto mx-auto max-w-md`}>
            {info.conclusion}
          </div>
        )}
      </div>
    </div>
  )
}

// 图片类信息图（豆包生成）
const ImageInfoGraphic = ({ data }) => {
  // 通过后端代理图片，解决CORS问题
  const getProxyUrl = (url) => {
    if (!url) return ''
    return `http://localhost:8000/proxy-image?url=${encodeURIComponent(url)}`
  }

  return (
    <div className="w-full">
      {/* 图片 - 宽度填满 */}
      {data.imageUrl && (
        <img 
          src={getProxyUrl(data.imageUrl)} 
          alt="信息图"
          className="w-full h-auto rounded-lg shadow-lg"
        />
      )}
    </div>
  )
}

// 流程类信息图 - 精美版
const ProcessInfoGraphic = ({ data }) => {
  const getKeyPointIcon = (icon) => {
    const iconProps = "w-5 h-5"
    switch (icon) {
      case 'info': return <Info className={`${iconProps} text-blue-500`} />
      case 'warning': return <AlertTriangle className={`${iconProps} text-amber-500`} />
      case 'check': return <CheckCircle className={`${iconProps} text-emerald-500`} />
      case 'calendar': return <Calendar className={`${iconProps} text-violet-500`} />
      case 'star': return <Target className={`${iconProps} text-yellow-500`} />
      case 'shield': return <CheckCircle className={`${iconProps} text-cyan-500`} />
      default: return <Info className={`${iconProps} text-blue-500`} />
    }
  }

  const getStepIcon = (icon, number) => {
    const iconClass = "w-6 h-6"
    switch (icon) {
      case 'upload': return <Upload className={iconClass} />
      case 'folder': return <MousePointer className={iconClass} />
      case 'click': return <FileCheck className={iconClass} />
      case 'search': return <Search className={iconClass} />
      case 'check': return <CheckCircle className={iconClass} />
      default: return <span className="text-xl font-bold">{number}</span>
    }
  }

  const stepColors = [
    { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-600' },
    { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
    { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-600' },
    { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-600' },
  ]

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-3xl p-8 min-h-[600px] shadow-inner">
      {/* 标题区域 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          {data.title}
        </h1>
        {data.subtitle && (
          <p className="text-gray-500 text-lg">{data.subtitle}</p>
        )}
      </div>

      {/* 关键信息卡片 */}
      {data.keyPoints && data.keyPoints.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[100px]" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              重要提示
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[100px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.keyPoints.map((point, idx) => (
              <div key={idx} className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-lg border border-white/50 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-sm">
                    {getKeyPointIcon(point.icon)}
                  </div>
                  <h3 className="font-bold text-gray-800">{point.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed pl-13">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 流程步骤 */}
      {data.steps && data.steps.length > 0 && (
        <div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[100px]" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              {data.processTitle || '操作流程'}
            </h2>
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1 max-w-[100px]" />
          </div>
          
          {/* 步骤卡片 - 横向排列 */}
          <div className="flex flex-wrap justify-center items-start gap-3">
            {data.steps.map((step, idx) => {
              const color = stepColors[idx % stepColors.length]
              return (
                <div key={idx} className="flex items-center">
                  {/* 步骤卡片 */}
                  <div className="w-36 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                    {/* 顶部彩色条 */}
                    <div className={`h-2 ${color.bg}`} />
                    {/* 内容 */}
                    <div className="p-4 text-center">
                      {/* 步骤编号 */}
                      <div className={`w-12 h-12 mx-auto rounded-xl ${color.light} ${color.text} flex items-center justify-center mb-3 shadow-sm`}>
                        {getStepIcon(step.icon, step.number)}
                      </div>
                      {/* 标题 */}
                      <h3 className="font-bold text-gray-800 text-sm mb-1">
                        {step.number}. {step.title}
                      </h3>
                      {/* 描述 */}
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                  {/* 箭头 */}
                  {idx < data.steps.length - 1 && (
                    <div className="mx-2 text-gray-300">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 研究类信息图
const ResearchInfoGraphic = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-2xl p-8 min-h-[500px]">
      {/* 标题 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm mb-4">
          <BookOpen className="w-4 h-4" />
          研究摘要
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{data.title}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 研究背景 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800">研究背景</h3>
          </div>
          <p className="text-gray-600 text-sm">{data.background}</p>
        </div>

        {/* 研究方法 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-800">研究方法</h3>
          </div>
          <p className="text-gray-600 text-sm">{data.method}</p>
        </div>
      </div>

      {/* 主要发现 */}
      {data.findings && data.findings.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-800">主要发现</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.findings.map((finding, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
                <h4 className="font-medium text-gray-800 text-sm mb-1">{finding.title}</h4>
                <p className="text-gray-600 text-xs">{finding.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结论 */}
      <div className="bg-indigo-600 text-white rounded-xl p-5 text-center">
        <h3 className="font-semibold mb-2">研究结论</h3>
        <p className="text-indigo-100">{data.conclusion}</p>
      </div>
    </div>
  )
}

// 报告类信息图
const ReportInfoGraphic = ({ data }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-8 min-h-[500px]">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{data.title}</h1>
        {data.period && (
          <p className="text-gray-500 text-sm">{data.period}</p>
        )}
      </div>

      {/* 指标卡片 */}
      {data.metrics && data.metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {data.metrics.map((metric, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-gray-500 text-xs mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
              {metric.change && (
                <div className={`flex items-center justify-center gap-1 mt-1 ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                  <span className="text-sm">{metric.change}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 要点 */}
      {data.highlights && data.highlights.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">关键要点</h3>
          <ul className="space-y-2">
            {data.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 总结 */}
      {data.summary && (
        <div className="bg-gray-800 text-white rounded-xl p-5 text-center">
          <p>{data.summary}</p>
        </div>
      )}
    </div>
  )
}

// 概念类信息图
const ConceptInfoGraphic = ({ data }) => {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-8 min-h-[500px]">
      {/* 核心概念 */}
      <div className="text-center mb-8">
        <div className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-full text-xl font-bold shadow-lg">
          {data.title}
        </div>
        {data.definition && (
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">{data.definition}</p>
        )}
      </div>

      {/* 分支 */}
      {data.branches && data.branches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {data.branches.map((branch, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-emerald-700 mb-3 text-center">{branch.name}</h3>
              <ul className="space-y-2">
                {branch.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 关系说明 */}
      {data.relationships && data.relationships.length > 0 && (
        <div className="bg-white/80 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 text-center">概念关系</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {data.relationships.map((rel, idx) => (
              <span key={idx} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">
                {rel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default InfoGraphicView
