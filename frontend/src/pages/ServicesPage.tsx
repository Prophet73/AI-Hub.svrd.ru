import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, FileText, BarChart3, Code2, Languages, MessageSquare, Loader2, Plus } from 'lucide-react'
import { api } from '../api/client'
import { useDebounce } from '../hooks/useDebounce'
import { useAuthStore } from '../store/auth'

interface Prompt {
  id: string
  name: string
  description: string | null
  category: string
  icon: string | null
}

interface PromptFull extends Prompt {
  prompt_text: string
}

// Category configuration
const CATEGORIES = {
  writing: { label: 'Написание', icon: FileText, color: '#10B981' },
  analysis: { label: 'Анализ', icon: BarChart3, color: '#3B82F6' },
  code: { label: 'Код', icon: Code2, color: '#8B5CF6' },
  translation: { label: 'Перевод', icon: Languages, color: '#F59E0B' },
  summary: { label: 'Резюме', icon: MessageSquare, color: '#EC4899' },
  other: { label: 'Другое', icon: Sparkles, color: '#64748B' },
} as const

type CategoryKey = keyof typeof CATEGORIES

function getCategoryConfig(category: string) {
  return CATEGORIES[category as CategoryKey] || CATEGORIES.other
}

function ServiceCard({ prompt, onClick }: { prompt: Prompt; onClick: () => void }) {
  const config = getCategoryConfig(prompt.category)
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className="card p-5 text-left w-full card-hover group transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <span style={{ color: config.color }}>
            <Icon className="w-6 h-6" />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[#5F6062] group-hover:text-[#E52713] transition-colors mb-1">
            {prompt.name}
          </h3>
          {prompt.description && (
            <p className="text-gray-500 text-sm line-clamp-2">{prompt.description}</p>
          )}
          <span
            className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: `${config.color}15`, color: config.color }}
          >
            {config.label}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function ServicesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data: prompts, isLoading, error } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const response = await api.get<Prompt[]>('/api/prompts')
      return response.data
    },
  })

  const handlePromptClick = async (promptId: string) => {
    try {
      const response = await api.get<PromptFull>(`/api/prompts/${promptId}`)
      navigate('/', { state: { initialPrompt: response.data.prompt_text } })
    } catch (err) {
      console.error('Failed to load prompt:', err)
    }
  }

  // Filter prompts
  const filteredPrompts = prompts?.filter((prompt) => {
    const matchesSearch = !debouncedSearch ||
      prompt.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchesCategory = !selectedCategory || prompt.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories from prompts
  const categories = [...new Set(prompts?.map((p) => p.category) || [])]

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#E52713]" />
            </div>
            <h1 className="text-2xl font-bold text-[#5F6062]">Промпты</h1>
          </div>
          <p className="text-gray-500">
            Готовые шаблоны для работы с AI-ассистентом
          </p>
        </div>
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/prompts')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Управление</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск промптов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem' }}
            className="w-full pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1] transition-all"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              !selectedCategory
                ? 'bg-[#E52713] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#E52713] hover:text-[#E52713]'
            }`}
          >
            Все
          </button>
          {categories.map((cat) => {
            const config = getCategoryConfig(cat)
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedCategory === cat
                    ? 'text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#E52713] hover:text-[#E52713]'
                }`}
                style={selectedCategory === cat ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#E52713] animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-gray-500">Не удалось загрузить промпты</p>
        </div>
      ) : filteredPrompts?.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {prompts?.length === 0
              ? 'Промпты пока не добавлены'
              : 'Ничего не найдено по вашему запросу'}
          </p>
          {prompts?.length === 0 && user?.is_admin && (
            <button
              onClick={() => navigate('/admin/prompts')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#E52713] text-white rounded-lg hover:bg-[#C91F0F] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить промпт</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPrompts?.map((prompt) => (
            <ServiceCard
              key={prompt.id}
              prompt={prompt}
              onClick={() => handlePromptClick(prompt.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
