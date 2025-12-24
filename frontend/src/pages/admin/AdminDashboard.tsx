import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, Shield, Download, Trash2, BarChart3, AppWindow, ArrowRight, ClipboardList, History } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'

interface Stats {
  users: { total: number; active: number; admins: number }
  applications: { total: number; active: number }
  groups: { total: number }
  tokens: { total: number; active: number }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get('/api/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      toast.error('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    try {
      const response = await api.post('/api/admin/cleanup-tokens')
      setCleanupResult(`Удалено ${response.data.deleted_codes} кодов и ${response.data.deleted_tokens} токенов`)
      toast.success('Токены успешно очищены')
      setTimeout(() => setCleanupResult(null), 5000)
      loadStats()
    } catch (error) {
      console.error('Cleanup failed:', error)
      toast.error('Не удалось очистить токены')
    }
  }

  const handleExport = async (type: 'users' | 'applications') => {
    try {
      const response = await api.get(`/api/admin/export/${type}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `hub_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Файл успешно скачан')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Не удалось экспортировать данные')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Статистика */}
      <div>
        <h2 className="text-lg font-bold text-[#5F6062] mb-4">Статистика</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/users" className="stat-card group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Пользователи</p>
                <p className="text-3xl font-bold text-[#5F6062]">{stats?.users.total || 0}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats?.users.active || 0} активных, {stats?.users.admins || 0} админов
                </p>
              </div>
              <div className="w-12 h-12 bg-[#FEF2F1] rounded-xl flex items-center justify-center group-hover:bg-[#E52713] transition-colors">
                <Users className="w-6 h-6 text-[#E52713] group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>

          <Link to="/admin/groups" className="stat-card group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Группы</p>
                <p className="text-3xl font-bold text-[#5F6062]">{stats?.groups.total || 0}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Групп доступа
                </p>
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
                <p className="text-xs text-gray-400 mt-1">
                  {stats?.applications.active || 0} активных
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                <Building2 className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </Link>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Активные токены</p>
                <p className="text-3xl font-bold text-[#5F6062]">{stats?.tokens.active || 0}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {stats?.tokens.total || 0} всего
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#5F6062]">Быстрые действия</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport('users')}
            className="flex items-center gap-3 px-4 py-3 bg-[#FEF2F1] text-[#E52713] rounded-xl hover:bg-[#E52713] hover:text-white transition-all duration-200"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Экспорт пользователей</span>
          </button>

          <button
            onClick={() => handleExport('applications')}
            className="flex items-center gap-3 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-500 hover:text-white transition-all duration-200"
          >
            <Download className="w-5 h-5" />
            <span className="font-medium">Экспорт приложений</span>
          </button>

          <button
            onClick={handleCleanup}
            className="flex items-center gap-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Очистить токены</span>
          </button>
        </div>

        {cleanupResult && (
          <div className="px-6 pb-4">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              {cleanupResult}
            </div>
          </div>
        )}
      </div>

      {/* Навигация по разделам */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#5F6062]">Управление</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <Link to="/admin/users" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FEF2F1] rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-[#E52713]" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">Пользователи</p>
                <p className="text-sm text-gray-500">Управление пользователями, назначение ролей</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>

          <Link to="/admin/groups" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">Группы</p>
                <p className="text-sm text-gray-500">Создание групп, управление участниками</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>

          <Link to="/admin/access" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">Управление доступом</p>
                <p className="text-sm text-gray-500">Настройка доступа к приложениям</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>

          <Link to="/admin/applications" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <AppWindow className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">OAuth2 приложения</p>
                <p className="text-sm text-gray-500">Управление OAuth2 клиентами и настройками</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>

          <Link to="/admin/audit-log" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">Журнал действий</p>
                <p className="text-sm text-gray-500">История действий администраторов</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>

          <Link to="/admin/login-history" className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="font-medium text-[#5F6062]">История входов</p>
                <p className="text-sm text-gray-500">Журнал входов пользователей в систему</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#E52713] transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}
