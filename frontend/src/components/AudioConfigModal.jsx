import React, { useState } from 'react'
import { X, Mic, FileText, MessageSquare, Users } from 'lucide-react'

const AudioConfigModal = ({ isOpen, onClose, onGenerate, isGenerating }) => {
  const [formatType, setFormatType] = useState('deep_dive')
  const [length, setLength] = useState('default')
  const [focus, setFocus] = useState('')

  if (!isOpen) return null

  const formats = [
    {
      id: 'deep_dive',
      title: '深度对话',
      description: '两位主持人深入讨论，解读文档核心内容',
      icon: Users,
      selected: true
    },
    {
      id: 'brief',
      title: '简要概述',
      description: '快速概括核心要点，帮助快速理解',
      icon: FileText
    },
    {
      id: 'critique',
      title: '专业评论',
      description: '专家视角的评论分析，提供建设性反馈',
      icon: MessageSquare
    },
    {
      id: 'debate',
      title: '观点辩论',
      description: '两位辩论者展示不同观点和视角',
      icon: Users
    }
  ]

  const handleGenerate = () => {
    onGenerate({ formatType, length, focus })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">音频概述</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 格式选择 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">格式</h3>
            <div className="grid grid-cols-2 gap-3">
              {formats.map((format) => {
                const Icon = format.icon
                const isSelected = formatType === format.id
                return (
                  <button
                    key={format.id}
                    onClick={() => setFormatType(format.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div>
                        <div className={`font-medium ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
                          {format.title}
                          {isSelected && <span className="ml-2 text-purple-600">✓</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {format.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 长度选择 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">长度</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setLength('short')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  length === 'short'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                简短
              </button>
              <button
                onClick={() => setLength('default')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  length === 'default'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                默认
              </button>
            </div>
          </div>

          {/* 关注点 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              AI 主持人应该关注什么？
            </h3>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={`可以尝试：\n• 关注特定主题（如"只讨论技术实现"）\n• 针对特定受众（如"用通俗易懂的方式解释"）\n• 强调某些方面（如"重点分析优缺点"）`}
              className="w-full h-32 px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              '生成'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AudioConfigModal
