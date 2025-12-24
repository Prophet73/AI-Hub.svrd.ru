import { useRef, useState } from 'react'
import {
  Bot,
  BarChart3,
  CheckSquare,
  FileText,
  Code2,
  MessageSquare,
  Plug,
  Box,
  ArrowRight,
  type LucideIcon
} from 'lucide-react'

interface Application {
  id: string
  name: string
  slug: string
  description: string | null
  base_url: string | null
  icon_url: string | null
}

interface AppCardProps {
  application: Application
}

// Категории с Lucide иконками - легко масштабировать
const APP_CATEGORIES = {
  ai: {
    label: 'AI & ML',
    icon: Bot,
    color: '#8B5CF6',
    bgColor: 'bg-violet-100',
    bgGradient: 'from-violet-100 to-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-600',
    hoverBorder: 'hover:border-violet-300',
    badgeBg: 'bg-violet-50',
    spotlightColor: 'rgba(139, 92, 246, 0.15)',
    keywords: ['ai', 'ml', 'chat', 'gpt', 'assistant', 'ассистент', 'нейро', 'llm']
  },
  analytics: {
    label: 'Аналитика',
    icon: BarChart3,
    color: '#3B82F6',
    bgColor: 'bg-blue-100',
    bgGradient: 'from-blue-100 to-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
    hoverBorder: 'hover:border-blue-300',
    badgeBg: 'bg-blue-50',
    spotlightColor: 'rgba(59, 130, 246, 0.15)',
    keywords: ['analytics', 'dashboard', 'аналитик', 'отчет', 'статистик', 'bi', 'метрик']
  },
  productivity: {
    label: 'Задачи',
    icon: CheckSquare,
    color: '#10B981',
    bgColor: 'bg-emerald-100',
    bgGradient: 'from-emerald-100 to-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600',
    hoverBorder: 'hover:border-emerald-300',
    badgeBg: 'bg-emerald-50',
    spotlightColor: 'rgba(16, 185, 129, 0.15)',
    keywords: ['task', 'project', 'задач', 'проект', 'управлен', 'tracker', 'kanban', 'todo']
  },
  documents: {
    label: 'Документы',
    icon: FileText,
    color: '#F59E0B',
    bgColor: 'bg-amber-100',
    bgGradient: 'from-amber-100 to-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-600',
    hoverBorder: 'hover:border-amber-300',
    badgeBg: 'bg-amber-50',
    spotlightColor: 'rgba(245, 158, 11, 0.15)',
    keywords: ['document', 'doc', 'protocol', 'документ', 'протокол', 'генерац', 'шаблон', 'pdf']
  },
  devtools: {
    label: 'DevTools',
    icon: Code2,
    color: '#6366F1',
    bgColor: 'bg-indigo-100',
    bgGradient: 'from-indigo-100 to-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-600',
    hoverBorder: 'hover:border-indigo-300',
    badgeBg: 'bg-indigo-50',
    spotlightColor: 'rgba(99, 102, 241, 0.15)',
    keywords: ['code', 'dev', 'review', 'git', 'deploy', 'код', 'разработ', 'ci', 'cd']
  },
  communication: {
    label: 'Связь',
    icon: MessageSquare,
    color: '#06B6D4',
    bgColor: 'bg-cyan-100',
    bgGradient: 'from-cyan-100 to-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-600',
    hoverBorder: 'hover:border-cyan-300',
    badgeBg: 'bg-cyan-50',
    spotlightColor: 'rgba(6, 182, 212, 0.15)',
    keywords: ['chat', 'mail', 'message', 'почт', 'сообщен', 'звон', 'meet', 'call']
  },
  integration: {
    label: 'Интеграции',
    icon: Plug,
    color: '#EC4899',
    bgColor: 'bg-pink-100',
    bgGradient: 'from-pink-100 to-pink-50',
    borderColor: 'border-pink-200',
    textColor: 'text-pink-600',
    hoverBorder: 'hover:border-pink-300',
    badgeBg: 'bg-pink-50',
    spotlightColor: 'rgba(236, 72, 153, 0.15)',
    keywords: ['api', 'integration', 'sync', 'интеграц', 'синхрон', 'webhook', 'connect']
  },
  other: {
    label: 'Сервис',
    icon: Box,
    color: '#64748B',
    bgColor: 'bg-slate-100',
    bgGradient: 'from-slate-100 to-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-600',
    hoverBorder: 'hover:border-slate-300',
    badgeBg: 'bg-slate-50',
    spotlightColor: 'rgba(100, 116, 139, 0.15)',
    keywords: []
  }
} as const

type CategoryKey = keyof typeof APP_CATEGORIES

function detectCategory(name: string, description: string | null): CategoryKey {
  const searchText = `${name} ${description || ''}`.toLowerCase()

  for (const [key, category] of Object.entries(APP_CATEGORIES)) {
    if (key === 'other') continue
    if (category.keywords.some(kw => searchText.includes(kw))) {
      return key as CategoryKey
    }
  }

  return 'other'
}

export default function AppCard({ application }: AppCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (application.base_url) {
      window.open(application.base_url, '_blank')
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const category = detectCategory(application.name, application.description)
  const cat = APP_CATEGORIES[category]
  const IconComponent: LucideIcon = cat.icon
  const isDisabled = !application.base_url

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden
        ${isDisabled
          ? 'opacity-50 cursor-not-allowed border-gray-200'
          : `cursor-pointer border-gray-200 ${cat.hoverBorder} hover:shadow-xl`
        }
      `}
    >
      {/* Spotlight effect */}
      {!isDisabled && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${cat.spotlightColor}, transparent 60%)`
          }}
        />
      )}

      <div className="relative z-10 p-6">
        <div className="flex items-start gap-5">
          {/* Иконка */}
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
            transition-transform duration-300 group-hover:scale-110
            bg-gradient-to-br ${cat.bgGradient} ${cat.borderColor} border
          `}>
            {application.icon_url ? (
              <img
                src={application.icon_url}
                alt={application.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <IconComponent className={`w-8 h-8 ${cat.textColor}`} strokeWidth={1.5} />
            )}
          </div>

          {/* Контент */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-[#E52713] transition-colors">
              {application.name}
            </h3>

            {application.description && (
              <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">
                {application.description}
              </p>
            )}
          </div>
        </div>

        {/* Footer с бейджем и стрелкой */}
        <div className="mt-5 flex items-center justify-between">
          <span className={`text-xs font-medium ${cat.textColor} ${cat.badgeBg} px-3 py-1.5 rounded-full`}>
            {cat.label}
          </span>
          {!isDisabled && (
            <ArrowRight className={`
              w-5 h-5 text-gray-400
              group-hover:text-[#E52713] group-hover:translate-x-1
              transition-all duration-300
            `} />
          )}
        </div>
      </div>
    </div>
  )
}

// Экспорт категорий для использования в других местах (фильтры, админка)
export { APP_CATEGORIES, detectCategory }
export type { CategoryKey }
