import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, X, ThumbsUp, ThumbsDown, MoreVertical } from 'lucide-react'

const AudioPlayer = ({ audioId, title, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const audioUrl = `http://localhost:8000/audio/${audioId}`

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
  }

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 z-50 shadow-lg min-w-[320px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* 标题 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">
          {title}
        </div>
      </div>

      {/* 播放/暂停按钮 */}
      <button
        onClick={togglePlay}
        className="w-9 h-9 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* 进度条和时间 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div 
          className="w-24 h-1.5 bg-gray-300 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-purple-600 rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-600 rounded-full" />
          </div>
        </div>
        <span className="text-xs text-gray-500 w-20 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-gray-600">
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-gray-600">
          <ThumbsDown className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-gray-600">
          <MoreVertical className="w-4 h-4" />
        </button>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default AudioPlayer
