import React, { useState } from 'react'
import { X, Sparkles, Briefcase, Cpu, Heart, Leaf, Palette } from 'lucide-react'

const styles = [
  { id: '商务简约', name: '商务简约', icon: Briefcase, color: 'from-blue-500 to-blue-600', desc: '专业、简洁、适合工作汇报' },
  { id: '可爱卡通', name: '可爱卡通', icon: Heart, color: 'from-pink-400 to-rose-400', desc: '萌系、活泼、适合轻松主题' },
]

const InfographicStyleModal = ({ isOpen, onClose, onGenerate }) => {
  const [selectedStyle, setSelectedStyle] = useState('商务简约')
  const [customStyle, setCustomStyle] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [orientation, setOrientation] = useState('landscape') // landscape, portrait, square
  const [detailLevel, setDetailLevel] = useState('standard') // concise, standard, detailed

  if (!isOpen) return null

  const handleGenerate = () => {
    const style = useCustom && customStyle.trim() ? customStyle.trim() : selectedStyle
    onGenerate({ style, orientation, detailLevel })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">选择信息图风格</h2>
              <p className="text-sm text-gray-500">选择一个预设风格或自定义</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 风格选择 */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {styles.map((style) => {
              const Icon = style.icon
              const isSelected = !useCustom && selectedStyle === style.id
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyle(style.id)
                    setUseCustom(false)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${style.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">{style.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">{style.desc}</p>
                </button>
              )
            })}
          </div>

          {/* 自定义风格 - 放在风格选择下面 */}
          <div className="mb-4">
            <button
              onClick={() => setUseCustom(!useCustom)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                useCustom 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">自定义风格</span>
              </div>
              <p className="text-xs text-gray-500">输入你想要的任意风格描述</p>
            </button>
            
            {useCustom && (
              <textarea
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                placeholder="例如：海绵宝宝风格、水墨中国风、像素游戏风格..."
                className="w-full mt-3 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
              />
            )}
          </div>

          {/* 比例选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择比例</label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrientation('landscape')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  orientation === 'landscape'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                横屏 16:9
              </button>
              <button
                onClick={() => setOrientation('portrait')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  orientation === 'portrait'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                竖屏 9:16
              </button>
              <button
                onClick={() => setOrientation('square')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  orientation === 'square'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                正方形 1:1
              </button>
            </div>
          </div>

          {/* 详细程度 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">详细程度</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDetailLevel('concise')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  detailLevel === 'concise'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                简洁
              </button>
              <button
                onClick={() => setDetailLevel('standard')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  detailLevel === 'standard'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                标准
              </button>
              <button
                onClick={() => setDetailLevel('detailed')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  detailLevel === 'detailed'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                详细
              </button>
            </div>
          </div>

          {/* 提示 */}
          <div className="bg-amber-50 rounded-xl p-3 mb-5">
            <p className="text-xs text-amber-700">
              ⏱️ 生成信息图需要约 <strong>30秒</strong>，请耐心等待
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition-opacity font-semibold"
            >
              开始生成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfographicStyleModal
