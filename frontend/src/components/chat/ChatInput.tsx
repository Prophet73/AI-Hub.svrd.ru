import { useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, Plus, StopCircle, History } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onNewChat?: () => void
  onStop?: () => void
  onHistory?: () => void
  disabled?: boolean
  isGenerating?: boolean
  placeholder?: string
  showNewChat?: boolean
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onNewChat,
  onStop,
  onHistory,
  disabled = false,
  isGenerating = false,
  placeholder = 'Сообщение SeverinGPT...',
  showNewChat = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${newHeight}px`
    }
  }, [value])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled && !isGenerating) {
        onSend()
      }
    }
  }

  const handleSend = () => {
    if (value.trim() && !disabled && !isGenerating) {
      onSend()
    }
  }

  const canSend = value.trim() && !disabled && !isGenerating

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="relative bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden focus-within:border-gray-300 focus-within:shadow-xl transition-all duration-200">
        {/* Input row */}
        <div className="flex items-end gap-3 p-4">
          {/* New Chat button */}
          {showNewChat && onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-[#E52713] hover:border-[#E52713] hover:bg-[#FEF2F1] transition-all"
              title="Новый чат"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* History button */}
          {onHistory && (
            <button
              type="button"
              onClick={onHistory}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-[#E52713] hover:border-[#E52713] hover:bg-[#FEF2F1] transition-all"
              title="История чатов"
            >
              <History className="w-5 h-5" />
            </button>
          )}

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none bg-transparent border-none outline-none text-[#5F6062] placeholder-gray-400 text-base leading-relaxed max-h-[200px] overflow-y-auto"
              style={{ minHeight: '28px' }}
            />
          </div>

          {/* Send/Stop button */}
          {isGenerating && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              title="Остановить генерацию"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                canSend
                  ? 'bg-[#E52713] text-white hover:bg-[#C91F0F] shadow-md hover:shadow-lg hover:scale-105'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Отправить"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom row with hints */}
        <div className="flex items-center justify-between px-4 pb-3 pt-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium">Enter</kbd> отправить
            </span>
            <span className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium">Shift+Enter</kbd> новая строка
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
