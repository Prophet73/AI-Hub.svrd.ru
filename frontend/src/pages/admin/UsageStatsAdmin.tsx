import { useEffect, useState } from 'react'
import { BarChart3, Users, MessageSquare, Sparkles, TrendingUp, Activity, DollarSign, Coins } from 'lucide-react'
import { api } from '../../api/client'

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
  users: {
    total_users: number
    active_users: number
  }
  logins: {
    logins_today: number
    logins_week: number
  }
  costs: {
    tokens_today: { input: number; output: number }
    tokens_week: { input: number; output: number }
    tokens_total: { input: number; output: number }
    cost_today_usd: number
    cost_week_usd: number
    cost_total_usd: number
    costs_by_day: Array<{ date: string; input_tokens: number; output_tokens: number; cost: number }>
    pricing: Record<string, { input: number; output: number }>
  }
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = 'text-[#E52713]',
  bgColor = 'bg-[#FEF2F1]',
}: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  color?: string
  bgColor?: string
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

function SimpleBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 text-center py-8">Нет данных</div>
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((item) => {
        const height = (item.count / maxCount) * 100
        const date = new Date(item.date)
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' })

        return (
          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">{item.count}</span>
            <div
              className="w-full bg-gradient-to-t from-[#E52713] to-[#FF6B5B] rounded-t-lg transition-all duration-300"
              style={{ height: `${Math.max(height, 4)}%` }}
            />
            <span className="text-xs text-gray-400">{dayName}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function UsageStatsAdmin() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/stats/usage')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
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

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Не удалось загрузить статистику</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[#E52713]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Статистика использования</h1>
          <p className="text-gray-500 text-sm">Аналитика сервисов и активности пользователей</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          title="Сообщений сегодня"
          value={stats.chat.messages_today}
          subtitle={`${stats.chat.messages_week} за неделю`}
        />
        <StatCard
          icon={Users}
          title="Активных пользователей"
          value={stats.chat.active_users_today}
          subtitle={`${stats.chat.active_users_week} за неделю`}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Activity}
          title="Сессий чата"
          value={stats.chat.sessions_today}
          subtitle={`${stats.chat.total_sessions} всего`}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          icon={TrendingUp}
          title="Входов сегодня"
          value={stats.logins.logins_today}
          subtitle={`${stats.logins.logins_week} за неделю`}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#5F6062] mb-4">Сообщения за неделю</h3>
          <SimpleBarChart data={stats.chat.messages_by_day} />
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#5F6062] mb-4">Топ пользователей</h3>
          {stats.chat.top_users.length === 0 ? (
            <div className="text-gray-400 text-center py-8">Нет данных</div>
          ) : (
            <div className="space-y-3">
              {stats.chat.top_users.slice(0, 5).map((user, index) => (
                <div key={user.name} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                          ? 'bg-gray-400'
                          : index === 2
                            ? 'bg-orange-400'
                            : 'bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#5F6062] truncate">{user.name}</p>
                  </div>
                  <div className="text-sm font-semibold text-[#E52713]">{user.messages}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Costs Section */}
      {stats.costs && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            title="Расходы сегодня"
            value={`$${stats.costs.cost_today_usd.toFixed(4)}`}
            subtitle={`${(stats.costs.tokens_today.input + stats.costs.tokens_today.output).toLocaleString()} токенов`}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={Coins}
            title="Расходы за неделю"
            value={`$${stats.costs.cost_week_usd.toFixed(4)}`}
            subtitle={`${(stats.costs.tokens_week.input + stats.costs.tokens_week.output).toLocaleString()} токенов`}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
          <StatCard
            icon={DollarSign}
            title="Всего расходов"
            value={`$${stats.costs.cost_total_usd.toFixed(4)}`}
            subtitle={`${(stats.costs.tokens_total.input + stats.costs.tokens_total.output).toLocaleString()} токенов`}
            color="text-red-600"
            bgColor="bg-red-50"
          />
        </div>
      )}

      {/* Token Details */}
      {stats.costs && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-5 h-5 text-[#E52713]" />
            <h3 className="text-lg font-semibold text-[#5F6062]">Использование токенов</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Сегодня</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Входные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_today.input.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Выходные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_today.output.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">За неделю</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Входные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_week.input.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Выходные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_week.output.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Всего</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Входные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_total.input.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Выходные:</span>
                  <span className="font-medium text-[#5F6062]">{stats.costs.tokens_total.output.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Цены: Gemini 3 Flash - $0.50/1M вход., $3.00/1M выход. | Gemini 3 Pro - $2.00/1M вход., $12.00/1M выход.
            </p>
          </div>
        </div>
      )}

      {/* Prompts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Prompts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#E52713]" />
            <h3 className="text-lg font-semibold text-[#5F6062]">Популярные промпты</h3>
          </div>
          {stats.prompts.top_prompts.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Промпты пока не использовались
            </div>
          ) : (
            <div className="space-y-3">
              {stats.prompts.top_prompts.map((prompt) => (
                <div key={prompt.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#5F6062]">{prompt.name}</p>
                    <p className="text-xs text-gray-400">{prompt.category}</p>
                  </div>
                  <span className="px-2 py-1 bg-[#FEF2F1] text-[#E52713] rounded-full text-xs font-medium">
                    {prompt.usage_count} раз
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-[#5F6062] mb-4">Общая статистика</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Всего сообщений</span>
              <span className="font-semibold text-[#5F6062]">{stats.chat.total_messages}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Всего сессий чата</span>
              <span className="font-semibold text-[#5F6062]">{stats.chat.total_sessions}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Активных промптов</span>
              <span className="font-semibold text-[#5F6062]">{stats.prompts.total_prompts}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Всего пользователей</span>
              <span className="font-semibold text-[#5F6062]">{stats.users.total_users}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500">Активных пользователей</span>
              <span className="font-semibold text-[#5F6062]">{stats.users.active_users}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
