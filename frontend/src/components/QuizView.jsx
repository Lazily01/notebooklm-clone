import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Check, X, RotateCcw, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'

function QuizView({ quiz = [], onExplain }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState({}) // 记录每题的答案
  const [isCompleted, setIsCompleted] = useState(false)
  const [showHint, setShowHint] = useState(false)

  const currentQuestion = quiz[currentIndex]
  const totalQuestions = quiz.length

  // 选择答案
  const selectAnswer = (option) => {
    if (showResult) return // 已显示结果时不能再选
    setSelectedAnswer(option)
    setShowResult(true)
    setAnswers(prev => ({ ...prev, [currentIndex]: option }))
  }

  // 下一题
  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(answers[currentIndex + 1] || null)
      setShowResult(answers[currentIndex + 1] !== undefined)
      setShowHint(false)
    } else {
      // 最后一题，显示结果
      setIsCompleted(true)
    }
  }

  // 跳过当前题
  const skipQuestion = () => {
    nextQuestion()
  }

  // 上一题
  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedAnswer(answers[currentIndex - 1] || null)
      setShowResult(answers[currentIndex - 1] !== undefined)
      setShowHint(false)
    }
  }

  // 重新测验
  const retakeQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setAnswers({})
    setIsCompleted(false)
    setShowHint(false)
  }

  // 回顾测验
  const reviewQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(answers[0] || null)
    setShowResult(answers[0] !== undefined)
    setIsCompleted(false)
  }

  // 计算结果
  const calculateResults = () => {
    let correct = 0
    let wrong = 0
    let skipped = 0
    
    quiz.forEach((q, idx) => {
      if (answers[idx] === undefined) {
        skipped++
      } else if (answers[idx] === q.answer) {
        correct++
      } else {
        wrong++
      }
    })
    
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
    return { correct, wrong, skipped, accuracy }
  }

  if (!quiz || quiz.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        暂无测验内容
      </div>
    )
  }

  // 完成页面
  if (isCompleted) {
    const results = calculateResults()
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-medium text-gray-800 mb-8">
          恭喜完成测验！
        </h2>
        
        <div className="flex gap-4 mb-8">
          {/* 得分 */}
          <div className="bg-gray-100 rounded-xl p-6 min-w-[120px]">
            <div className="text-sm text-gray-500 mb-2">得分</div>
            <div className="text-3xl font-bold text-gray-800">
              {results.correct} / {totalQuestions}
            </div>
          </div>
          
          {/* 正确率 */}
          <div className="bg-gray-100 rounded-xl p-6 min-w-[120px]">
            <div className="text-sm text-gray-500 mb-2">正确率</div>
            <div className="text-3xl font-bold text-gray-800">
              {results.accuracy}%
            </div>
          </div>
          
          {/* 详细统计 */}
          <div className="bg-gray-100 rounded-xl p-6 min-w-[120px]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">正确</span>
              <span className="text-green-600 font-medium">{results.correct}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">错误</span>
              <span className="text-red-500 font-medium">{results.wrong}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">跳过</span>
              <span className="text-gray-600 font-medium">{results.skipped}</span>
            </div>
          </div>
        </div>
        
        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={reviewQuiz}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            回顾测验
          </button>
          <button
            onClick={retakeQuiz}
            className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            重新测验
          </button>
        </div>
      </div>
    )
  }

  // 选项颜色
  const optionColors = {
    A: 'text-orange-500',
    B: 'text-blue-500',
    C: 'text-green-500',
    D: 'text-purple-500'
  }

  // 获取选项样式
  const getOptionStyle = (option) => {
    if (!showResult) {
      return 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
    }
    
    const isCorrect = option === currentQuestion.answer
    const isSelected = option === selectedAnswer
    
    if (isCorrect) {
      return 'bg-green-100 border-green-300'
    }
    if (isSelected && !isCorrect) {
      return 'bg-red-50 border-red-200'
    }
    return 'bg-gray-50 opacity-60'
  }

  return (
    <div className="flex flex-col h-full">
      {/* 题目区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 进度 */}
        <div className="text-sm text-gray-400 mb-4">
          {currentIndex + 1} / {totalQuestions}
        </div>
        
        {/* 问题 */}
        <h2 className="text-xl font-medium text-gray-800 mb-6 leading-relaxed">
          {currentQuestion?.question}
        </h2>
        
        {/* 选项 */}
        <div className="space-y-3">
          {currentQuestion?.options && Object.entries(currentQuestion.options).map(([key, value]) => (
            <div
              key={key}
              onClick={() => selectAnswer(key)}
              className={`p-4 rounded-xl border transition-all ${getOptionStyle(key)} ${!showResult ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`font-medium ${optionColors[key]}`}>{key}.</span>
                <div className="flex-1">
                  <p className="text-gray-700">{value}</p>
                  
                  {/* 显示结果反馈 */}
                  {showResult && key === currentQuestion.answer && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-green-600 font-medium text-sm mb-1">
                        <Check className="w-4 h-4" />
                        {selectedAnswer === key ? '回答正确！' : '正确答案'}
                      </div>
                      <p className="text-sm text-gray-600">{currentQuestion.explanation}</p>
                    </div>
                  )}
                  
                  {showResult && key === selectedAnswer && key !== currentQuestion.answer && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-red-500 font-medium text-sm">
                        <X className="w-4 h-4" />
                        回答错误
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 提示区域 */}
        {!showResult && (
          <div className="mt-6">
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              提示
              {showHint ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showHint && (
              <div className="mt-3 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  {currentQuestion?.hint || `请仔细阅读题目和选项，结合文档内容进行分析。`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 底部按钮 */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={() => {
            if (onExplain && currentQuestion) {
              onExplain(currentQuestion.question, currentQuestion.options, currentQuestion.answer, currentQuestion.explanation)
            }
          }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          详细解释
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className={`px-4 py-2 border border-gray-300 rounded-full text-sm transition-colors ${
              currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            上一题
          </button>
          {!showResult && (
            <button
              onClick={skipQuestion}
              className="px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              跳过
            </button>
          )}
          <button
            onClick={nextQuestion}
            disabled={!showResult}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              showResult 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {currentIndex === totalQuestions - 1 ? '完成' : '下一题'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizView
