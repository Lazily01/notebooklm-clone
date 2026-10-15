import React, { useState } from 'react'
import { X, Presentation, Check } from 'lucide-react'

// 模板配置
const templates = [
  {
    id: 'business',
    title: '商务专业',
    description: '简洁大气',
    preview: {
      bg: 'bg-gradient-to-br from-blue-900 to-blue-700',
      titleColor: 'text-white',
      accent: 'bg-blue-400'
    }
  },
  {
    id: 'tech',
    title: '科技感',
    description: '现代炫酷',
    preview: {
      bg: 'bg-gradient-to-br from-slate-900 to-purple-900',
      titleColor: 'text-cyan-400',
      accent: 'bg-cyan-500'
    }
  },
  {
    id: 'academic',
    title: '学术风格',
    description: '严谨规范',
    preview: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100',
      titleColor: 'text-amber-900',
      accent: 'bg-amber-600'
    }
  },
  {
    id: 'creative',
    title: '创意活泼',
    description: '生动有趣',
    preview: {
      bg: 'bg-gradient-to-br from-pink-200 to-purple-300',
      titleColor: 'text-pink-700',
      accent: 'bg-pink-500'
    }
  },
  {
    id: 'minimal',
    title: '极简风格',
    description: '留白优雅',
    preview: {
      bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      titleColor: 'text-gray-800',
      accent: 'bg-gray-400'
    }
  }
]

const SlidesConfigModal = ({ onClose, onGenerate }) => {
  const [selectedStyle, setSelectedStyle] = useState('business')
  const [slideCount, setSlideCount] = useState(10)

  const handleGenerate = () => {
    onGenerate({
      style: selectedStyle,
      slideCount: slideCount
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col mx-4">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">选择模板</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 模板选择 - 卡片式预览 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {templates.map((template) => {
              const isSelected = selectedStyle === template.id
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedStyle(template.id)}
                  className={`relative rounded-xl overflow-hidden transition-all hover:scale-105 ${
                    isSelected 
                      ? 'ring-4 ring-indigo-500 ring-offset-2' 
                      : 'ring-1 ring-gray-200 hover:ring-indigo-300'
                  }`}
                >
                  {/* 模板预览 - 模拟幻灯片 */}
                  <div className={`aspect-video ${template.preview.bg} p-4 flex flex-col justify-center`}>
                    {/* 模拟标题 */}
                    <div className={`text-sm font-bold ${template.preview.titleColor} mb-2`}>
                      示例标题
                    </div>
                    {/* 模拟要点 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${template.preview.accent}`} />
                        <div className={`h-1.5 w-16 ${template.preview.accent} opacity-60 rounded`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${template.preview.accent}`} />
                        <div className={`h-1.5 w-12 ${template.preview.accent} opacity-60 rounded`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${template.preview.accent}`} />
                        <div className={`h-1.5 w-20 ${template.preview.accent} opacity-60 rounded`} />
                      </div>
                    </div>
                  </div>
                  
                  {/* 模板信息 */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm">{template.title}</h4>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 页数设置 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">幻灯片页数</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="20"
                value={slideCount}
                onChange={(e) => setSlideCount(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-lg font-medium text-gray-800 w-12 text-center">
                {slideCount}页
              </span>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Presentation className="w-4 h-4" />
            生成幻灯片
          </button>
        </div>
      </div>
    </div>
  )
}

export default SlidesConfigModal
