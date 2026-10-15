import React, { useState } from 'react'
import { X, FileText, BookOpen, Pencil, ChevronLeft } from 'lucide-react'

const ReportConfigModal = ({ onClose, onGenerate }) => {
  const [step, setStep] = useState(1) // 1: 选择格式, 2: 自己创作详情
  const [selectedFormat, setSelectedFormat] = useState(null)
  const [customDescription, setCustomDescription] = useState('')

  const formats = [
    {
      id: 'custom',
      title: '自己创作',
      description: 'Craft报告通过具体的结构、风格、语气等内容来呈现',
      icon: Pencil,
      hasNextStep: true
    },
    {
      id: 'study_guide',
      title: '学习指南',
      description: '问答测验、建议作文题目及关键术语词汇表',
      icon: BookOpen,
      hasNextStep: false
    },
    {
      id: 'blog',
      title: '博客文章',
      description: '深刻的见解浓缩成一篇极具可读性的文章',
      icon: FileText,
      hasNextStep: false
    }
  ]

  const handleFormatSelect = (format) => {
    setSelectedFormat(format)
    if (format.hasNextStep) {
      setStep(2)
    }
  }

  const handleGenerate = () => {
    if (!selectedFormat) return
    
    onGenerate({
      formatType: selectedFormat.id,
      customDescription: selectedFormat.id === 'custom' ? customDescription : ''
    })
  }

  const canGenerate = () => {
    if (!selectedFormat) return false
    if (selectedFormat.id === 'custom' && !customDescription.trim()) return false
    return true
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* 标题栏 */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button 
                onClick={() => setStep(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-800">创建报告</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <>
              {/* 格式选择 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">格式</h3>
                <div className="grid grid-cols-3 gap-4">
                  {formats.map((format) => {
                    const Icon = format.icon
                    const isSelected = selectedFormat?.id === format.id
                    return (
                      <button
                        key={format.id}
                        onClick={() => handleFormatSelect(format)}
                        className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-50' 
                            : 'border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-800">{format.title}</h4>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-600' : 'text-amber-500'}`} />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {format.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 自己创作 - 详情页 */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择语言
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                    <option value="zh">中文（简体）</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述你想制作的报告
                  </label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="例如：&#10;&#10;为2026年功能性饮料市场制定正式的竞争性评审，寻找一款新的健康饮品。基调应具分析性和战略性，重点关注主要竞争对手的分销和定价，以指导我们的发布策略。"
                    className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>
              </div>
            </>
          )}
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
            disabled={!canGenerate()}
            className={`px-6 py-2 rounded-lg transition-colors ${
              canGenerate()
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            生成
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportConfigModal
