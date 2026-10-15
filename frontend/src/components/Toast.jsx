import React, { useState, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

// Toast Context
const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Provider
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    warning: (msg, duration) => showToast(msg, 'warning', duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  )
}

// Toast Item
const ToastItem = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }

  return (
    <div 
      className={`flex items-center gap-3 px-5 py-4 rounded-xl border shadow-lg ${bgColors[toast.type]} animate-fade-in min-w-[300px] max-w-[500px]`}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {icons[toast.type]}
      <span className="flex-1 text-gray-800">{toast.message}</span>
      <button 
        onClick={onClose}
        className="p-1 hover:bg-black/10 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  )
}

export default ToastProvider
