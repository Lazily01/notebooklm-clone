import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

const ExcelPreview = ({ docId, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sheetsData, setSheetsData] = useState({})
  const [currentSheet, setCurrentSheet] = useState(null)

  useEffect(() => {
    loadExcelData()
  }, [docId])

  const loadExcelData = async () => {
    try {
      console.log('[ExcelPreview] 开始加载 Excel 数据, docId:', docId)
      const response = await axios.get(`${API_BASE}/documents/${docId}/excel-preview`)
      console.log('[ExcelPreview] 收到响应:', response.data)
      
      if (!response.data || Object.keys(response.data).length === 0) {
        setError('Excel 数据为空')
        return
      }
      
      setSheetsData(response.data)
      // 设置第一个工作表为当前显示
      const firstSheet = Object.keys(response.data)[0]
      console.log('[ExcelPreview] 当前工作表:', firstSheet)
      setCurrentSheet(firstSheet)
    } catch (error) {
      console.error('[ExcelPreview] 加载 Excel 数据失败:', error)
      console.error('[ExcelPreview] 错误详情:', error.response)
      setError(error.response?.data?.detail || error.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-gray-500">正在加载 Excel 内容...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-red-500">
        <span>加载失败: {error}</span>
      </div>
    )
  }

  const sheets = Object.keys(sheetsData)
  const currentData = sheetsData[currentSheet] || []
  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : []

  return (
    <div className="flex flex-col h-full">
      {/* 工作表切换 */}
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
        {sheets.map(sheetName => (
          <button
            key={sheetName}
            onClick={() => setCurrentSheet(sheetName)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              currentSheet === sheetName
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {sheetName}
          </button>
        ))}
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((col, colIdx) => (
                  <td
                    key={`${rowIdx}-${colIdx}`}
                    className="px-4 py-2 text-sm text-gray-900 border whitespace-pre-wrap"
                  >
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ExcelPreview
