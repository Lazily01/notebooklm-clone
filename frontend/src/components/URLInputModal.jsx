import React, { useState } from 'react'
import { X, Link } from 'lucide-react'

const URLInputModal = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim())
      setUrl('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">导入网页</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            网页链接
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            autoFocus
          />
          <p className="mt-2 text-xs text-gray-500">
            输入完整的网页 URL，包括 http:// 或 https://
          </p>
        </div>

        {/* 按钮区 */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            导入
          </button>
        </div>
      </div>
    </div>
  )
}

export default URLInputModal
