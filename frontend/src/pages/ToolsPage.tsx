import { useEffect, useState, ComponentType } from 'react'
import {
  Clock, Wrench, AlertCircle,
  FileSpreadsheet, ScanText, FileText, ImageIcon, Calculator,
  Database, Code, Terminal, Cpu, HardDrive, Cloud, Globe,
  Mail, MessageSquare, Search, Filter, Download, Upload,
  RefreshCw, Zap, Sparkles, Bot, type LucideProps
} from 'lucide-react'
import { api } from '../api/client'

// Map of icon names to components
const iconMap: Record<string, ComponentType<LucideProps>> = {
  Wrench, FileSpreadsheet, ScanText, FileText, ImageIcon, Calculator,
  Database, Code, Terminal, Cpu, HardDrive, Cloud, Globe,
  Mail, MessageSquare, Search, Filter, Download, Upload,
  RefreshCw, Zap, Sparkles, Bot, AlertCircle, Clock
}

interface Tool {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  is_available: boolean
}

function ToolCard({ tool }: { tool: Tool }) {
  // Get icon from map or fallback to Wrench
  const IconComponent = iconMap[tool.icon] || Wrench
  const isAvailable = tool.is_available

  const handleClick = () => {
    if (!isAvailable) return
    // TODO: Open tool interface or navigate to tool page
    console.log('Tool clicked:', tool.slug)
  }

  return (
    <div
      onClick={handleClick}
      className={`card p-6 transition-all duration-200 ${
        !isAvailable
          ? 'opacity-70 cursor-not-allowed'
          : 'card-hover cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${tool.color}15` }}
        >
          <span style={{ color: tool.color }}>
            <IconComponent className="w-7 h-7" />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-[#5F6062]">{tool.name}</h3>
            {!isAvailable && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full">
                <AlertCircle className="w-3 h-3" />
                Недоступен
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm line-clamp-2">{tool.description}</p>
        </div>
      </div>
    </div>
  )
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await api.get('/api/tools')
      setTools(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load tools:', err)
      setError('Не удалось загрузить инструменты')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">{error}</h3>
        <button
          onClick={loadTools}
          className="mt-4 px-4 py-2 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-[#E52713]" />
          </div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Инструменты</h1>
        </div>
        <p className="text-gray-500">
          Полезные утилиты для работы с документами и данными
        </p>
      </div>

      {/* Tools grid */}
      {tools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">Нет доступных инструментов</h3>
          <p className="text-gray-400">Инструменты будут добавлены администратором</p>
        </div>
      )}

      {/* Info notice */}
      {tools.length > 0 && tools.every(t => !t.is_available) && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
            <Clock className="w-4 h-4" />
            Сервера инструментов временно недоступны
          </div>
        </div>
      )}
    </div>
  )
}
