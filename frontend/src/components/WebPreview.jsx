import React, { useState, useEffect } from 'react'
import { Loader2, X, ExternalLink, Globe } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

const API_BASE = 'http://localhost:8000'

const WebPreview = ({ docId, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    loadWebData()
  }, [docId])

  const loadWebData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/documents/${docId}/content`)
      const doc = response.data
      
      setContent(doc.content || '')
      setTitle(doc.name || '网页')
      setUrl(doc.url || '')
    } catch (error) {
      console.error('加载网页数据失败:', error)
      setError(error.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
        <div className="flex flex-col items-center justify-center h-full py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <span className="text-gray-500">正在加载网页内容...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
        <div className="flex items-center justify-center h-full py-12 text-red-500">
          <span>加载失败: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[500px] bg-white border-l border-gray-200 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h3 className="text-sm font-medium text-gray-700 truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="在新标签页打开"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* URL 显示 */}
      {url && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline truncate block"
          >
            {url}
          </a>
        </div>
      )}

      {/* 内容显示（Markdown 格式） */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default WebPreview
