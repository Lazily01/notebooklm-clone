import React, { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Download, ExternalLink } from 'lucide-react'

function FlashcardView({ flashcards = [], isFullscreen = false, onToggleFullscreen, onExplain }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentCard = flashcards[currentIndex]
  const totalCards = flashcards.length

  // 翻转卡片
  const flipCard = useCallback(() => {
    setIsFlipped(!isFlipped)
  }, [isFlipped])

  // 上一张
  const prevCard = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  // 下一张
  const nextCard = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, totalCards])

  // 重置
  const reset = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  // 下载 CSV
  const downloadCsv = () => {
    if (!flashcards || flashcards.length === 0) return
    
    // 生成 CSV 内容，A列问题，B列答案
    let csvContent = '\uFEFF' // BOM for UTF-8
    flashcards.forEach(card => {
      // 处理特殊字符，用双引号包裹并转义内部双引号
      const question = `"${(card.question || '').replace(/"/g, '""')}"`
      const answer = `"${(card.answer || '').replace(/"/g, '""')}"`
      csvContent += `${question},${answer}\n`
    })
    
    // 创建下载
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = '闪卡.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flipCard()
      } else if (e.code === 'ArrowLeft') {
        prevCard()
      } else if (e.code === 'ArrowRight') {
        nextCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipCard, prevCard, nextCard])

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        暂无闪卡内容
      </div>
    )
  }

  const progress = ((currentIndex + 1) / totalCards) * 100

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部提示 */}
      <div className="text-center py-3 text-sm text-gray-400">
        按空格键翻转，← / → 切换卡片
      </div>

      {/* 卡片区域 */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        {/* 左箭头 */}
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          className={`absolute left-4 p-3 rounded-full border-2 transition-all ${
            currentIndex === 0 
              ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
              : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* 卡片 */}
        <div 
          className="w-80 cursor-pointer"
          onClick={flipCard}
          style={{ perspective: '1000px' }}
        >
          <div 
            className={`relative w-full transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{ 
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* 正面 - 问题 */}
            <div 
              className="w-full min-h-[480px] rounded-3xl p-8 flex flex-col justify-between backface-hidden"
              style={{ 
                backfaceVisibility: 'hidden',
                backgroundColor: '#2d2d2d'
              }}
            >
              <div className="flex-1 flex items-center">
                <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                  {currentCard?.question}
                </h2>
              </div>
              <button 
                className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  flipCard()
                }}
              >
                查看答案
              </button>
            </div>

            {/* 反面 - 答案 */}
            <div 
              className="absolute inset-0 w-full min-h-[480px] rounded-3xl p-8 flex flex-col justify-between backface-hidden rotate-y-180"
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 60%, #e8f5e9 100%)'
              }}
            >
              <div className="flex-1 flex items-center">
                <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed">
                  {currentCard?.answer}
                </p>
              </div>
              <button 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm border border-gray-300 rounded-full px-4 py-2 w-fit"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onExplain && currentCard) {
                    onExplain(currentCard.question, currentCard.answer)
                  }
                }}
              >
                <ExternalLink className="w-4 h-4" />
                详细解释
              </button>
            </div>
          </div>
        </div>

        {/* 右箭头 */}
        <button
          onClick={nextCard}
          disabled={currentIndex === totalCards - 1}
          className={`absolute right-4 p-3 rounded-full border-2 transition-all ${
            currentIndex === totalCards - 1 
              ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
              : 'border-blue-400 text-blue-500 hover:border-blue-500 hover:text-blue-600'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* 底部进度条 */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={reset}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="重置"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {currentIndex + 1} / {totalCards} 张
          </span>
          
          <button 
            onClick={downloadCsv}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="下载 CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FlashcardView
