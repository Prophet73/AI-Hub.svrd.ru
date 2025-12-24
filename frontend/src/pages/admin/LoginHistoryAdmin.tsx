import { useState, useEffect } from 'react'
import { History, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'

interface LoginHistoryEntry {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  login_type: string
  ip_address: string | null
  user_agent: string | null
  success: boolean
  failure_reason: string | null
  created_at: string
}

interface PaginatedResponse {
  items: LoginHistoryEntry[]
  total: number
  page: number
  per_page: number
  pages: number
}

const LOGIN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'sso': { label: 'SSO (ADFS)', color: 'bg-blue-100 text-blue-700' },
  'dev': { label: 'Dev Login', color: 'bg-amber-100 text-amber-700' },
  'oauth_authorize': { label: 'OAuth', color: 'bg-purple-100 text-purple-700' },
}

export default function LoginHistoryAdmin() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [successFilter, setSuccessFilter] = useState<boolean | null>(null)
  const [loginType, setLoginType] = useState('')

  useEffect(() => {
    loadLoginHistory()
  }, [page, debouncedSearch, successFilter, loginType])

  const loadLoginHistory = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('per_page', '20')
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (successFilter !== null) params.append('success', String(successFilter))
      if (loginType) params.append('login_type', loginType)

      const response = await api.get(`/api/admin/login-history?${params}`)
      setData(response.data)
    } catch (error) {
      console.error('Failed to load login history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getLoginTypeLabel = (type: string) => {
    const config = LOGIN_TYPE_LABELS[type] || { label: type, color: 'bg-gray-100 text-gray-700' }
    return config
  }

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return '-'
    // Простой парсинг для отображения браузера
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    if (ua.includes('Opera')) return 'Opera'
    return 'Другой'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
          <History className="w-5 h-5 text-[#E52713]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">История входов</h1>
          <p className="text-gray-500 text-sm">Журнал авторизаций пользователей</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Поиск по email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                style={{ paddingLeft: '3rem' }}
                className="w-full pr-4 py-2.5 bg-white border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <select
            value={loginType}
            onChange={(e) => { setLoginType(e.target.value); setPage(1) }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Все типы</option>
            <option value="sso">SSO (ADFS)</option>
            <option value="dev">Dev Login</option>
            <option value="oauth_authorize">OAuth</option>
          </select>

          <select
            value={successFilter === null ? '' : String(successFilter)}
            onChange={(e) => {
              setSuccessFilter(e.target.value === '' ? null : e.target.value === 'true')
              setPage(1)
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Все статусы</option>
            <option value="true">Успешные</option>
            <option value="false">Неуспешные</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 spinner"></div>
          </div>
        ) : (
          <>
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Пользователь</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Тип</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Браузер</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.items.map((entry) => {
                  const typeConfig = getLoginTypeLabel(entry.login_type)
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entry.user_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{entry.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.success ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Успешно</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm">Ошибка</span>
                            </div>
                            {entry.failure_reason && (
                              <p className="text-xs text-gray-500 mt-0.5">{entry.failure_reason}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {entry.ip_address || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {parseUserAgent(entry.user_agent)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {data?.items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Записей не найдено</p>
              </div>
            )}

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Показано {(page - 1) * 20 + 1} - {Math.min(page * 20, data.total)} из {data.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-2 text-sm">
                    {page} / {data.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
