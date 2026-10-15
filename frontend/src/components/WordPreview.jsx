import React, { useState, useEffect } from 'react'
import { Loader2, X } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

const WordPreview = ({ docId, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [htmlContent, setHtmlContent] = useState('')
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    loadWordData()
  }, [docId])

  const loadWordData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/documents/${docId}/word-preview`)
      setHtmlContent(response.data.html)
      setFileName(response.data.name)
    } catch (error) {
      console.error('加载 Word 数据失败:', error)
      setError(error.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-[800px] bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-center h-full py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <span className="text-gray-500">正在加载 Word 内容...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[800px] bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-center h-full py-12 text-red-500">
          <span>加载失败: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[800px] bg-white border-l border-gray-200 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">
          📄 {fileName || 'Word 文档'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 内容显示 */}
      <div className="flex-1 overflow-auto p-6">
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  )
}

export default WordPreview
