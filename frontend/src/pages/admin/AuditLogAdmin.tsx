import React, { useState, useEffect } from 'react'
import { ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'

interface AuditLogEntry {
  id: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

interface PaginatedResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  per_page: number
  pages: number
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'user.update': { label: 'Обновление пользователя', color: 'bg-blue-100 text-blue-700' },
  'user.bulk_activate': { label: 'Массовая активация', color: 'bg-green-100 text-green-700' },
  'user.bulk_deactivate': { label: 'Массовая деактивация', color: 'bg-red-100 text-red-700' },
  'user.bulk_make_admin': { label: 'Массовое назначение админов', color: 'bg-purple-100 text-purple-700' },
  'user.bulk_remove_admin': { label: 'Массовое снятие админов', color: 'bg-orange-100 text-orange-700' },
  'group.create': { label: 'Создание группы', color: 'bg-green-100 text-green-700' },
  'group.update': { label: 'Обновление группы', color: 'bg-blue-100 text-blue-700' },
  'group.delete': { label: 'Удаление группы', color: 'bg-red-100 text-red-700' },
  'access.grant': { label: 'Предоставление доступа', color: 'bg-green-100 text-green-700' },
  'access.revoke': { label: 'Отзыв доступа', color: 'bg-red-100 text-red-700' },
}

export default function AuditLogAdmin() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [entityType, setEntityType] = useState('')

  useEffect(() => {
    loadAuditLog()
  }, [page, debouncedSearch, entityType])

  const loadAuditLog = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('per_page', '20')
      if (debouncedSearch) params.append('action', debouncedSearch)
      if (entityType) params.append('entity_type', entityType)

      const response = await api.get(`/api/admin/audit-log?${params}`)
      setData(response.data)
    } catch (error) {
      console.error('Failed to load audit log:', error)
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

  const getActionLabel = (action: string) => {
    const config = ACTION_LABELS[action] || { label: action, color: 'bg-gray-100 text-gray-700' }
    return config
  }

  const renderChanges = (oldVals: Record<string, unknown> | null, newVals: Record<string, unknown> | null) => {
    if (!oldVals && !newVals) return null

    const changes: React.ReactNode[] = []

    if (newVals) {
      Object.entries(newVals).forEach(([key, val]) => {
        const oldVal = oldVals?.[key]
        if (oldVal !== undefined) {
          changes.push(
            <div key={key} className="text-xs">
              <span className="text-gray-500">{key}:</span>{' '}
              <span className="text-red-600 line-through">{String(oldVal)}</span>
              {' -> '}
              <span className="text-green-600">{String(val)}</span>
            </div>
          )
        } else {
          changes.push(
            <div key={key} className="text-xs">
              <span className="text-gray-500">{key}:</span>{' '}
              <span className="text-green-600">{String(val)}</span>
            </div>
          )
        }
      })
    }

    return changes.length > 0 ? <div className="space-y-0.5">{changes}</div> : null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-[#E52713]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Журнал действий</h1>
          <p className="text-gray-500 text-sm">История действий администраторов</p>
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
                placeholder="Поиск по действию..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                style={{ paddingLeft: '3rem' }}
                className="w-full pr-4 py-2.5 bg-white border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Все типы</option>
            <option value="user">Пользователи</option>
            <option value="group">Группы</option>
            <option value="application">Приложения</option>
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
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Действие</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Изменения</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.items.map((log) => {
                  const actionConfig = getActionLabel(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.user_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{log.user_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${actionConfig.color}`}>
                          {actionConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {renderChanges(log.old_values, log.new_values)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {log.ip_address || '-'}
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
