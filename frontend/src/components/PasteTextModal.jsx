import { useState } from 'react'

export default function PasteTextModal({ isOpen, onClose, onSubmit }) {
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(text.trim())
      setText('')
      onClose()
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">NotebookLM</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Paste copied text</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            来粘贴你所复制的文本内容吧！
          </p>
          
          <div className="relative">
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-blue-600 font-medium">
              Paste text here *
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="粘贴文本内容..."
              className="w-full h-48 px-4 py-3 border-2 border-blue-500 rounded-lg focus:outline-none focus:border-blue-600 resize-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  )
}
