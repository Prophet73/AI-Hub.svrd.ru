import { useEffect, useState } from 'react'
import { Search, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react'
import { api } from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { toast } from '../../store/toast'

interface User {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  department: string | null
  is_active: boolean
  is_admin: boolean
  last_login_at: string | null
  created_at: string
  groups: string[]
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [filterAdmin, setFilterAdmin] = useState<boolean | null>(null)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    action: string
    title: string
    message: string
  }>({ isOpen: false, action: '', title: '', message: '' })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, filterAdmin, filterActive])

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (filterAdmin !== null) params.append('is_admin', String(filterAdmin))
      if (filterActive !== null) params.append('is_active', String(filterActive))

      const response = await api.get(`/api/admin/users?${params}`)
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Не удалось загрузить пользователей')
    } finally {
      setLoading(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const selectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)))
    }
  }

  const showBulkConfirmation = (action: string) => {
    if (selectedUsers.size === 0) return

    const actionLabels: Record<string, { title: string; message: string }> = {
      activate: {
        title: 'Активировать пользователей',
        message: `Вы уверены, что хотите активировать ${selectedUsers.size} пользователей?`
      },
      deactivate: {
        title: 'Деактивировать пользователей',
        message: `Вы уверены, что хотите деактивировать ${selectedUsers.size} пользователей?`
      },
      make_admin: {
        title: 'Назначить администраторами',
        message: `Вы уверены, что хотите сделать ${selectedUsers.size} пользователей администраторами?`
      },
      remove_admin: {
        title: 'Снять права администратора',
        message: `Вы уверены, что хотите снять права администратора у ${selectedUsers.size} пользователей?`
      }
    }

    const config = actionLabels[action] || { title: 'Подтверждение', message: 'Выполнить действие?' }
    setConfirmDialog({
      isOpen: true,
      action,
      title: config.title,
      message: config.message
    })
  }

  const handleBulkAction = async () => {
    if (selectedUsers.size === 0 || !confirmDialog.action) return

    setActionLoading(true)
    try {
      await api.post('/api/admin/users/bulk', {
        user_ids: Array.from(selectedUsers),
        action: confirmDialog.action
      })
      setSelectedUsers(new Set())
      toast.success('Действие выполнено успешно')
      loadUsers()
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('Не удалось выполнить действие')
    } finally {
      setActionLoading(false)
      setConfirmDialog({ isOpen: false, action: '', title: '', message: '' })
    }
  }

  const toggleUserAdmin = async (user: User) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, {
        is_admin: !user.is_admin
      })
      toast.success(user.is_admin ? 'Права администратора сняты' : 'Пользователь стал администратором')
      loadUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Не удалось обновить пользователя')
    }
  }

  const toggleUserActive = async (user: User) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, {
        is_active: !user.is_active
      })
      toast.success(user.is_active ? 'Пользователь деактивирован' : 'Пользователь активирован')
      loadUsers()
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Не удалось обновить пользователя')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserName = (user: User) => {
    if (user.last_name && user.first_name) {
      return `${user.last_name} ${user.first_name}`
    }
    return user.display_name || user.email.split('@')[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#5F6062]">Пользователи</h1>
        <p className="text-gray-500 mt-1">Управление пользователями системы</p>
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
                placeholder="Поиск по email или имени..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '3rem' }}
                className="w-full pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#E52713]/20 focus:border-[#E52713]"
              />
            </div>
          </div>

          <select
            value={filterAdmin === null ? '' : String(filterAdmin)}
            onChange={(e) => setFilterAdmin(e.target.value === '' ? null : e.target.value === 'true')}
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Все роли</option>
            <option value="true">Только админы</option>
            <option value="false">Только пользователи</option>
          </select>

          <select
            value={filterActive === null ? '' : String(filterActive)}
            onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Все статусы</option>
            <option value="true">Только активные</option>
            <option value="false">Только неактивные</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-[#FEF2F1] rounded-xl p-4 flex items-center justify-between">
          <span className="text-[#E52713] font-medium">
            Выбрано: {selectedUsers.size}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => showBulkConfirmation('activate')}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Активировать
            </button>
            <button
              onClick={() => showBulkConfirmation('deactivate')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Деактивировать
            </button>
            <button
              onClick={() => showBulkConfirmation('make_admin')}
              className="px-4 py-2 bg-[#E52713] text-white rounded-lg text-sm font-medium hover:bg-[#C91F0F] transition-colors"
            >
              Сделать админом
            </button>
            <button
              onClick={() => showBulkConfirmation('remove_admin')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Снять админа
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 spinner"></div>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300 text-[#E52713] focus:ring-[#E52713]"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Пользователь</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Отдел</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Группы</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Последний вход</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className={`${!user.is_active ? 'bg-gray-50' : ''} hover:bg-gray-50 transition-colors`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300 text-[#E52713] focus:ring-[#E52713]"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-[#5F6062]">{getUserName(user)}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {user.department || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.groups.length > 0 ? (
                        user.groups.map((group, i) => (
                          <span key={i} className="badge badge-gray">
                            {group}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {user.is_admin && (
                        <span className="badge badge-brand">
                          Админ
                        </span>
                      )}
                      <span className={`badge ${user.is_active ? 'badge-success' : 'bg-gray-100 text-gray-500'}`}>
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleUserAdmin(user)}
                        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                          user.is_admin ? 'text-[#E52713]' : 'text-gray-400'
                        }`}
                        title={user.is_admin ? 'Снять права админа' : 'Сделать админом'}
                      >
                        {user.is_admin ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => toggleUserActive(user)}
                        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                          user.is_active ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                        title={user.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        {user.is_active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Пользователи не найдены</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: '', title: '', message: '' })}
        onConfirm={handleBulkAction}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Подтвердить"
        cancelText="Отмена"
        danger={confirmDialog.action === 'deactivate' || confirmDialog.action === 'remove_admin'}
        loading={actionLoading}
      />
    </div>
  )
}
