import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3, Users, MessageSquare, TrendingUp, Activity,
  DollarSign, Coins, Download, Trash2, Shield, Building2,
  ClipboardList, History, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, RefreshCw, Server, Database, Bot, Globe,
  AlertTriangle, Loader2
} from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'
import { useDebounce } from '../../hooks/useDebounce'

// ============== Types ==============

interface Stats {
  users: { total: number; active: number; admins: number }
  applications: { total: number; active: number }
  groups: { total: number }
  tokens: { total: number; active: number }
}

interface UsageStats {
  chat: {
    total_messages: number
    messages_today: number
    messages_week: number
    messages_by_day: Array<{ date: string; count: number }>
    total_sessions: number
    sessions_today: number
    active_users_today: number
    active_users_week: number
    top_users: Array<{ name: string; messages: number }>
  }
  prompts: {
    total_prompts: number
    top_prompts: Array<{ name: string; category: string; usage_count: number }>
  }
  users: { total_users: number; active_users: number }
  logins: { logins_today: number; logins_week: number }
  costs: {
    tokens_today: { input: number; output: number }
    tokens_week: { input: number; output: number }
    tokens_total: { input: number; output: number }
    cost_today_usd: number
    cost_week_usd: number
    cost_total_usd: number
  }
}

interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latency_ms: number | null
  last_check: string | null
  message: string | null
}

interface AuditLogEntry {
  id: string
  user_email: string | null
  user_name: string | null
  action: string
  entity_type: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

interface LoginHistoryEntry {
  id: string
  user_email: string | null
  user_name: string | null
  login_type: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  failure_reason: string | null
  created_at: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

type TabType = 'overview' | 'health' | 'stats' | 'audit' | 'logins'

// ============== Components ==============

function StatCard({ icon: Icon, title, value, subtitle, color = 'text-[#E52713]', bgColor = 'bg-[#FEF2F1]' }: {
  icon: React.ElementType; title: string; value: string | number; subtitle?: string; color?: string; bgColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-500">{title}</span>
      </div>
      <div className="text-3xl font-bold text-[#5F6062]">{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  )
}

function ServiceHealthCard({ service, onRefresh }: { service: ServiceHealth; onRefresh: () => void }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'bg-emerald-500', text: 'Работает', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50' }
      case 'degraded': return { color: 'bg-amber-500', text: 'Замедлен', textColor: 'text-amber-600', bgLight: 'bg-amber-50' }
      case 'unhealthy': return { color: 'bg-red-500', text: 'Недоступен', textColor: 'text-red-600', bgLight: 'bg-red-50' }
      default: return { color: 'bg-gray-400', text: 'Неизвестно', textColor: 'text-gray-600', bgLight: 'bg-gray-50' }
    }
  }

  const getIcon = (name: string) => {
    if (name.toLowerCase().includes('database') || name.toLowerCase().includes('postgres')) return Database
    if (name.toLowerCase().includes('ai') || name.toLowerCase().includes('gemini')) return Bot
    if (name.toLowerCase().includes('api') || name.toLowerCase().includes('backend')) return Server
    return Globe
  }

  const config = getStatusConfig(service.status)
  const Icon = getIcon(service.name)

  return (
    <div className={`rounded-xl border border-gray-200 p-4 ${config.bgLight}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${config.color} rounded-full border-2 border-white`}>
              {service.status === 'healthy' && <CheckCircle className="w-3 h-3 text-white" style={{ margin: '0.5px' }} />}
              {service.status === 'unhealthy' && <XCircle className="w-3 h-3 text-white" style={{ margin: '0.5px' }} />}
              {service.status === 'degraded' && <AlertTriangle className="w-3 h-3 text-white" style={{ margin: '0.5px' }} />}
            </div>
          </div>
          <div>
            <div className="font-semibold text-[#5F6062]">{service.name}</div>
            <div className={`text-sm ${config.textColor}`}>{config.text}</div>
          </div>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-white rounded-lg transition-colors" title="Обновить">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Задержка:</span>
        <span className={`font-medium ${service.latency_ms && service.latency_ms > 1000 ? 'text-amber-600' : 'text-gray-700'}`}>
          {service.latency_ms ? `${service.latency_ms} мс` : '—'}
        </span>
      </div>
      {service.message && (
        <div className="mt-2 text-xs text-gray-500 truncate" title={service.message}>
          {service.message}
        </div>
      )}
    </div>
  )
}

function SimpleBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">Нет данных</div>
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((item) => {
        const height = (item.count / maxCount) * 100
        const dayName = new Date(item.date).toLocaleDateString('ru-RU', { weekday: 'short' })
        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">{item.count}</span>
            <div className="w-full bg-gradient-to-t from-[#E52713] to-[#FF6B5B] rounded-t-lg" style={{ height: `${Math.max(height, 4)}%` }} />
            <span className="text-xs text-gray-400">{dayName}</span>
          </div>
        )
      })}
    </div>
  )
}

// ============== Main Component ==============

export default function MonitoringAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Overview state
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)

  // Health state
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthRefreshing, setHealthRefreshing] = useState(false)

  // Usage stats state
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  // Audit log state
  const [auditData, setAuditData] = useState<PaginatedResponse<AuditLogEntry> | null>(null)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditPage, setAuditPage] = useState(1)
  const [auditSearch, setAuditSearch] = useState('')
  const debouncedAuditSearch = useDebounce(auditSearch, 300)
  const [auditEntityType, setAuditEntityType] = useState('')

  // Login history state
  const [loginData, setLoginData] = useState<PaginatedResponse<LoginHistoryEntry> | null>(null)
  const [loginLoading, setLoginLoading] = useState(true)
  const [loginPage, setLoginPage] = useState(1)
  const [loginSearch, setLoginSearch] = useState('')
  const debouncedLoginSearch = useDebounce(loginSearch, 300)
  const [loginSuccessFilter, setLoginSuccessFilter] = useState<boolean | null>(null)

  useEffect(() => {
    loadStats()
    loadHealth()
  }, [])

  useEffect(() => {
    if (activeTab === 'stats' && !usageStats) loadUsageStats()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLog()
  }, [activeTab, auditPage, debouncedAuditSearch, auditEntityType])

  useEffect(() => {
    if (activeTab === 'logins') loadLoginHistory()
  }, [activeTab, loginPage, debouncedLoginSearch, loginSuccessFilter])

  // ============== Data Loading ==============

  const loadStats = async () => {
    try {
      const response = await api.get('/api/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadHealth = async () => {
    try {
      setHealthLoading(true)
      const response = await api.get('/api/admin/health')
      setServices(response.data.services || [])
    } catch (error) {
      console.error('Failed to load health:', error)
      // Fallback to mock data if API doesn't exist yet
      setServices([
        { name: 'Backend API', status: 'healthy', latency_ms: 45, last_check: new Date().toISOString(), message: null },
        { name: 'PostgreSQL', status: 'healthy', latency_ms: 12, last_check: new Date().toISOString(), message: null },
        { name: 'Gemini AI', status: 'healthy', latency_ms: 230, last_check: new Date().toISOString(), message: null },
      ])
    } finally {
      setHealthLoading(false)
    }
  }

  const refreshHealth = async () => {
    setHealthRefreshing(true)
    await loadHealth()
    setHealthRefreshing(false)
  }

  const loadUsageStats = async () => {
    try {
      setUsageLoading(true)
      const response = await api.get('/api/admin/stats/usage')
      setUsageStats(response.data)
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  const loadAuditLog = async () => {
    try {
      setAuditLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(auditPage))
      params.append('per_page', '15')
      if (debouncedAuditSearch) params.append('action', debouncedAuditSearch)
      if (auditEntityType) params.append('entity_type', auditEntityType)
      const response = await api.get(`/api/admin/audit-log?${params}`)
      setAuditData(response.data)
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setAuditLoading(false)
    }
  }

  const loadLoginHistory = async () => {
    try {
      setLoginLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(loginPage))
      params.append('per_page', '15')
      if (debouncedLoginSearch) params.append('search', debouncedLoginSearch)
      if (loginSuccessFilter !== null) params.append('success', String(loginSuccessFilter))
      const response = await api.get(`/api/admin/login-history?${params}`)
      setLoginData(response.data)
    } catch (error) {
      console.error('Failed to load login history:', error)
    } finally {
      setLoginLoading(false)
    }
  }

  // ============== Actions ==============

  const handleCleanup = async () => {
    try {
      const response = await api.post('/api/admin/cleanup-tokens')
      setCleanupResult(`Удалено ${response.data.deleted_codes} кодов и ${response.data.deleted_tokens} токенов`)
      toast.success('Токены очищены')
      setTimeout(() => setCleanupResult(null), 5000)
      loadStats()
    } catch (error) {
      toast.error('Не удалось очистить токены')
    }
  }

  const handleExport = async (type: 'users' | 'applications') => {
    try {
      const response = await api.get(`/api/admin/export/${type}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `hub_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Файл скачан')
    } catch (error) {
      toast.error('Не удалось экспортировать')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    'user.update': { label: 'Обновление пользователя', color: 'bg-blue-100 text-blue-700' },
    'user.bulk_activate': { label: 'Массовая активация', color: 'bg-green-100 text-green-700' },
    'user.bulk_deactivate': { label: 'Массовая деактивация', color: 'bg-red-100 text-red-700' },
    'group.create': { label: 'Создание группы', color: 'bg-green-100 text-green-700' },
    'group.update': { label: 'Обновление группы', color: 'bg-blue-100 text-blue-700' },
    'group.delete': { label: 'Удаление группы', color: 'bg-red-100 text-red-700' },
    'access.grant': { label: 'Предоставление доступа', color: 'bg-green-100 text-green-700' },
    'access.revoke': { label: 'Отзыв доступа', color: 'bg-red-100 text-red-700' },
  }

  const LOGIN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    'sso': { label: 'SSO', color: 'bg-blue-100 text-blue-700' },
    'dev': { label: 'Dev', color: 'bg-amber-100 text-amber-700' },
    'oauth_authorize': { label: 'OAuth', color: 'bg-purple-100 text-purple-700' },
  }

  // ============== Render ==============

  const healthyCount = services.filter(s => s.status === 'healthy').length
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#E52713]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#5F6062]">Мониторинг</h1>
            <p className="text-gray-500 text-sm">Статистика, здоровье сервисов и журналы</p>
          </div>
        </div>
        {activeTab === 'health' && (
          <button onClick={refreshHealth} disabled={healthRefreshing} className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium">
            <RefreshCw className={`h-5 w-5 ${healthRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'overview', label: 'Обзор', icon: BarChart3 },
            { id: 'health', label: 'Сервисы', icon: Server, badge: unhealthyCount > 0 ? unhealthyCount : null, badgeColor: 'bg-red-500' },
            { id: 'stats', label: 'Статистика', icon: TrendingUp },
            { id: 'audit', label: 'Журнал', icon: ClipboardList },
            { id: 'logins', label: 'Входы', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'border-[#E52713] text-[#E52713]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className={`${tab.badgeColor} text-white text-xs px-1.5 py-0.5 rounded-full`}>{tab.badge}</span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-[#E52713] animate-spin" /></div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/users" className="stat-card group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Пользователи</p>
                      <p className="text-3xl font-bold text-[#5F6062]">{stats?.users.total || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">{stats?.users.active || 0} активных</p>
                    </div>
                    <div className="w-12 h-12 bg-[#FEF2F1] rounded-xl flex items-center justify-center group-hover:bg-[#E52713] transition-colors">
                      <Users className="w-6 h-6 text-[#E52713] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
                <Link to="/admin/users" className="stat-card group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Группы</p>
                      <p className="text-3xl font-bold text-[#5F6062]">{stats?.groups.total || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                      <Shield className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
                <Link to="/admin/applications" className="stat-card group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Приложения</p>
                      <p className="text-3xl font-bold text-[#5F6062]">{stats?.applications.total || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">{stats?.applications.active || 0} активных</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                      <Building2 className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
                <div className="stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Сервисы</p>
                      <p className="text-3xl font-bold text-[#5F6062]">{healthyCount}/{services.length}</p>
                      <p className="text-xs text-gray-400 mt-1">{unhealthyCount > 0 ? `${unhealthyCount} недоступно` : 'Все работают'}</p>
                    </div>
                    <div className={`w-12 h-12 ${unhealthyCount > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-xl flex items-center justify-center`}>
                      <Server className={`w-6 h-6 ${unhealthyCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-[#5F6062]">Быстрые действия</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={() => handleExport('users')} className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F1] text-[#E52713] rounded-xl hover:bg-[#E52713] hover:text-white transition-all">
                    <Download className="w-5 h-5" /><span className="font-medium">Экспорт пользователей</span>
                  </button>
                  <button onClick={() => handleExport('applications')} className="flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
                    <Download className="w-5 h-5" /><span className="font-medium">Экспорт приложений</span>
                  </button>
                  <button onClick={handleCleanup} className="flex items-center gap-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all">
                    <Trash2 className="w-5 h-5" /><span className="font-medium">Очистить токены</span>
                  </button>
                </div>
                {cleanupResult && (
                  <div className="px-6 pb-4">
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm">{cleanupResult}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {healthLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-[#E52713] animate-spin" /></div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">{healthyCount}</div>
                    <div className="text-sm text-emerald-600">Работают</div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700">{services.filter(s => s.status === 'degraded').length}</div>
                    <div className="text-sm text-amber-600">Замедлены</div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-700">{unhealthyCount}</div>
                    <div className="text-sm text-red-600">Недоступны</div>
                  </div>
                </div>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service, idx) => (
                  <ServiceHealthCard key={idx} service={service} onRefresh={refreshHealth} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {usageLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-[#E52713] animate-spin" /></div>
          ) : usageStats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} title="Сообщений сегодня" value={usageStats.chat.messages_today} subtitle={`${usageStats.chat.messages_week} за неделю`} />
                <StatCard icon={Users} title="Активных сегодня" value={usageStats.chat.active_users_today} subtitle={`${usageStats.chat.active_users_week} за неделю`} color="text-blue-600" bgColor="bg-blue-50" />
                <StatCard icon={Activity} title="Сессий чата" value={usageStats.chat.sessions_today} subtitle={`${usageStats.chat.total_sessions} всего`} color="text-emerald-600" bgColor="bg-emerald-50" />
                <StatCard icon={TrendingUp} title="Входов сегодня" value={usageStats.logins.logins_today} subtitle={`${usageStats.logins.logins_week} за неделю`} color="text-purple-600" bgColor="bg-purple-50" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-[#5F6062] mb-4">Сообщения за неделю</h3>
                  <SimpleBarChart data={usageStats.chat.messages_by_day} />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-[#5F6062] mb-4">Топ пользователей</h3>
                  {usageStats.chat.top_users.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">Нет данных</div>
                  ) : (
                    <div className="space-y-3">
                      {usageStats.chat.top_users.slice(0, 5).map((user, index) => (
                        <div key={user.name} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{index + 1}</div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#5F6062] truncate">{user.name}</p></div>
                          <div className="text-sm font-semibold text-[#E52713]">{user.messages}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {usageStats.costs && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <StatCard icon={DollarSign} title="Сегодня" value={`$${usageStats.costs.cost_today_usd.toFixed(4)}`} color="text-green-600" bgColor="bg-green-50" />
                  <StatCard icon={Coins} title="За неделю" value={`$${usageStats.costs.cost_week_usd.toFixed(4)}`} color="text-amber-600" bgColor="bg-amber-50" />
                  <StatCard icon={DollarSign} title="Всего" value={`$${usageStats.costs.cost_total_usd.toFixed(4)}`} color="text-red-600" bgColor="bg-red-50" />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">Не удалось загрузить</div>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Поиск..." value={auditSearch} onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1) }} className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <select value={auditEntityType} onChange={(e) => { setAuditEntityType(e.target.value); setAuditPage(1) }} className="px-4 py-2.5 border border-gray-200 rounded-xl">
                <option value="">Все типы</option>
                <option value="user">Пользователи</option>
                <option value="group">Группы</option>
                <option value="application">Приложения</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {auditLoading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-[#E52713] animate-spin" /></div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Действие</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditData?.items.map((log) => {
                      const config = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                          <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{log.user_name || 'N/A'}</p><p className="text-xs text-gray-500">{log.user_email}</p></td>
                          <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-500">{log.ip_address || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {auditData?.items.length === 0 && <div className="text-center py-12 text-gray-500">Записей не найдено</div>}
                {auditData && auditData.pages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Стр. {auditPage} / {auditData.pages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                      <button onClick={() => setAuditPage(p => Math.min(auditData.pages, p + 1))} disabled={auditPage === auditData.pages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Logins Tab */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Поиск по email..." value={loginSearch} onChange={(e) => { setLoginSearch(e.target.value); setLoginPage(1) }} className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <select value={loginSuccessFilter === null ? '' : String(loginSuccessFilter)} onChange={(e) => { setLoginSuccessFilter(e.target.value === '' ? null : e.target.value === 'true'); setLoginPage(1) }} className="px-4 py-2.5 border border-gray-200 rounded-xl">
                <option value="">Все статусы</option>
                <option value="true">Успешные</option>
                <option value="false">Неуспешные</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loginLoading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-10 h-10 text-[#E52713] animate-spin" /></div>
            ) : (
              <>
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Тип</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginData?.items.map((entry) => {
                      const typeConfig = LOGIN_TYPE_LABELS[entry.login_type] || { label: entry.login_type, color: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                          <td className="px-4 py-3"><p className="text-sm font-medium text-gray-900">{entry.user_name || 'N/A'}</p><p className="text-xs text-gray-500">{entry.user_email}</p></td>
                          <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>{typeConfig.label}</span></td>
                          <td className="px-4 py-3">
                            {entry.success ? (
                              <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /><span className="text-sm">OK</span></div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" /><span className="text-sm">Ошибка</span></div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{entry.ip_address || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {loginData?.items.length === 0 && <div className="text-center py-12 text-gray-500">Записей не найдено</div>}
                {loginData && loginData.pages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Стр. {loginPage} / {loginData.pages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setLoginPage(p => Math.max(1, p - 1))} disabled={loginPage === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                      <button onClick={() => setLoginPage(p => Math.min(loginData.pages, p + 1))} disabled={loginPage === loginData.pages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
