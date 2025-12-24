import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot, AlertCircle, MessageSquare, Trash2, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react'
import ChatMessage from '../components/chat/ChatMessage'
import { ClaudeChatInput } from '../components/claude-style-chat-input'
import { api } from '../api/client'

interface ChatSession {
  session_id: string
  title: string
  created_at: string
  last_activity: string
  message_count: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface UsageInfo {
  messages_today: number
  daily_limit: number
  remaining: number
}

interface ChatConfig {
  default_model: string
  models: Array<{ id: string; name: string; description: string }>
}

export default function ChatPage() {
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch chat sessions
  const { data: sessions, refetch: refetchSessions } = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: async () => {
      const response = await api.get('/api/chat/sessions')
      return response.data
    },
  })

  // Fetch usage info
  const { data: usage, refetch: refetchUsage } = useQuery<UsageInfo>({
    queryKey: ['chat-usage'],
    queryFn: async () => {
      const response = await api.get('/api/chat/usage')
      return response.data
    },
    refetchInterval: 60000,
  })

  // Fetch chat config (models and default model)
  const { data: chatConfig } = useQuery<ChatConfig>({
    queryKey: ['chat-config'],
    queryFn: async () => {
      const response = await api.get('/api/chat/config')
      return response.data
    },
  })

  // Handle initial prompt from Prompts page
  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt
    if (initialPrompt && chatConfig?.default_model) {
      handleSendMessage({ message: initialPrompt, model: chatConfig.default_model })
      window.history.replaceState({}, document.title)
    }
  }, [location.state, chatConfig?.default_model])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  const handleSendMessage = useCallback(async (data: {
    message: string;
    model: string;
  }) => {
    if (!data.message.trim() || isTyping) return

    const userMessage = data.message.trim()
    setError(null)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка при отправке сообщения')
      }

      const newSessionId = response.headers.get('X-Session-Id')
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId)
        refetchSessions()
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Не удалось получить ответ')
      }

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        let skipNextData = false
        for (const line of lines) {
          if (line.startsWith('event: done')) {
            skipNextData = true
          } else if (line.startsWith('event: error')) {
            skipNextData = false
            const errorLine = lines.find((l) => l.startsWith('data: '))
            throw new Error(errorLine?.slice(6) || 'Ошибка генерации')
          } else if (line.startsWith('data: ')) {
            if (skipNextData) {
              skipNextData = false
              continue
            }
            const lineData = line.slice(6)
            if (lineData) {
              fullContent += lineData
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: fullContent } : msg
                )
              )
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, isStreaming: false } : msg
        )
      )

      refetchUsage()
      refetchSessions()
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantId))
      } else {
        setError(err.message || 'Произошла ошибка')
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: `Ошибка: ${err.message}`, isStreaming: false }
              : msg
          )
        )
      }
    } finally {
      setIsTyping(false)
      abortControllerRef.current = null
    }
  }, [isTyping, sessionId, refetchUsage, refetchSessions])

  const handleNewChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setMessages([])
    setSessionId(null)
    setError(null)
    setIsTyping(false)
  }, [])

  const loadSession = useCallback(async (sid: string) => {
    try {
      const response = await api.get(`/api/chat/history/${sid}`)
      const history = response.data as Array<{ id: string; role: string; content: string; created_at: string }>
      setMessages(
        history.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
      )
      setSessionId(sid)
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }, [])

  const deleteSession = useCallback(async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.delete(`/api/chat/history/${sid}`)
      refetchSessions()
      if (sessionId === sid) {
        handleNewChat()
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }, [sessionId, handleNewChat, refetchSessions])

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-[calc(100vh-12rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#E52713] to-[#C91F0F] rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#5F6062] mb-2">
                SeverinGPT
              </h2>
              <p className="text-gray-500 max-w-md mb-8">
                Ваш корпоративный AI-ассистент
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                {[
                  { icon: '✉️', text: 'Помоги составить письмо' },
                  { icon: '📊', text: 'Проанализируй данные' },
                  { icon: '💻', text: 'Напиши код на Python' },
                  { icon: '🌐', text: 'Переведи на английский' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => handleSendMessage({ message: suggestion.text, model: chatConfig?.default_model || 'gemini-3-flash-preview' })}
                    className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[#5F6062] hover:border-[#E52713] hover:bg-[#FEF2F1] transition-all shadow-sm text-left group"
                  >
                    <span className="text-lg">{suggestion.icon}</span>
                    <span className="group-hover:text-[#E52713] transition-colors">{suggestion.text}</span>
                  </button>
                ))}
              </div>

              {usage && (
                <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    {usage.remaining} из {usage.daily_limit} сообщений сегодня
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
              {messages.map((message) => (
                // Skip empty streaming messages - typing indicator will show instead
                message.isStreaming && !message.content ? null : (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isStreaming={message.isStreaming}
                  />
                )
              ))}

              {isTyping && messages[messages.length - 1]?.content === '' && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#E52713] to-[#C91F0F] flex items-center justify-center shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-[#E52713] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#E52713] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#E52713] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 py-4 px-4">
          <ClaudeChatInput
            onSendMessage={handleSendMessage}
            disabled={(usage?.remaining ?? 1) <= 0}
            placeholder={
              (usage?.remaining ?? 1) <= 0
                ? 'Достигнут дневной лимит сообщений'
                : 'Чем могу помочь?'
            }
            models={chatConfig?.models}
            defaultModel={chatConfig?.default_model}
          />

          <div className="flex justify-center items-center gap-3 mt-2">
            {hasMessages && usage && (
              <>
                <span className={`text-xs ${usage.remaining <= 10 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {usage.remaining} / {usage.daily_limit} сообщений
                </span>
                <span className="text-xs text-gray-300">•</span>
              </>
            )}
            <span className="text-xs text-gray-400">Чаты хранятся 7 дней</span>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      <div className={`flex-shrink-0 border-l border-gray-200 bg-white transition-all duration-300 ${historyOpen ? 'w-72' : 'w-12'}`}>
        {/* Toggle button */}
        <div className="p-2 border-b border-gray-100">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={historyOpen ? 'Свернуть' : 'Развернуть'}
          >
            {historyOpen ? (
              <PanelRightClose className="w-5 h-5 text-gray-500" />
            ) : (
              <PanelRightOpen className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {historyOpen && (
          <>
            {/* New chat button */}
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[#E52713] hover:bg-[#C91F0F] text-white rounded-xl transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Новый чат
              </button>
            </div>

            {/* Sessions list */}
            <div className="overflow-y-auto h-[calc(100%-120px)]">
              {sessions && sessions.length > 0 ? (
                <div className="p-2">
                  {sessions.map((session) => (
                    <div
                      key={session.session_id}
                      onClick={() => loadSession(session.session_id)}
                      className={`group flex items-start gap-2 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-[#FEF2F1] mb-1 ${
                        sessionId === session.session_id ? 'bg-[#FEF2F1] border border-[#E52713]/20' : ''
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#5F6062] truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(session.last_activity).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                          })} • {session.message_count} сообщ.
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(session.session_id, e)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-lg transition-all"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Нет истории</p>
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  )
}
