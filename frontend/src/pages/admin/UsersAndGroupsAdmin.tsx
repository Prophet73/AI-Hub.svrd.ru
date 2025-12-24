import { useEffect, useState } from 'react'
import {
  Search, Users, User, Shield, ShieldOff, UserCheck, UserX,
  Plus, X, Building2, Clock, Mail, Edit2, Trash2
} from 'lucide-react'
import { api } from '../../api/client'
import { useDebounce } from '../../hooks/useDebounce'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { toast } from '../../store/toast'

// ============== Types ==============

interface UserType {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  department: string | null
  is_active: boolean
  is_admin: boolean
  is_super_admin: boolean
  last_login_at: string | null
  created_at: string
  groups: string[]
}

interface GroupType {
  id: string
  name: string
  description: string | null
  color: string
  member_count: number
  created_at: string
  members?: GroupMember[]
}

interface GroupMember {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  department: string | null
}

interface AppAccess {
  id: string
  application_id: string
  application_name: string
  access_type: 'direct' | 'group'
  group_name?: string
}

type SelectedItem =
  | { type: 'user'; data: UserType }
  | { type: 'group'; data: GroupType }
  | null

// ============== Main Component ==============

export default function UsersAndGroupsAdmin() {
  // Data
  const [users, setUsers] = useState<UserType[]>([])
  const [groups, setGroups] = useState<GroupType[]>([])
  const [loading, setLoading] = useState(true)

  // Selection
  const [selected, setSelected] = useState<SelectedItem>(null)
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<GroupMember[]>([])
  const [userAppAccess, setUserAppAccess] = useState<AppAccess[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [filterType, setFilterType] = useState<'all' | 'admins' | 'inactive'>('all')
  const [sidebarCollapsed] = useState(false)

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupType | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: '#E52713' })

  // Add to group
  const [showAddToGroupModal, setShowAddToGroupModal] = useState(false)
  const [availableGroups, setAvailableGroups] = useState<GroupType[]>([])

  // Add member to group
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [allUsersForAdd, setAllUsersForAdd] = useState<UserType[]>([])
  const [memberSearch, setMemberSearch] = useState('')

  // Confirmations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    danger?: boolean
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const [saving, setSaving] = useState(false)

  // ============== Load Data ==============

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [debouncedSearch, filterType])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadUsers(), loadGroups()])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (filterType === 'admins') params.append('is_admin', 'true')
      if (filterType === 'inactive') params.append('is_active', 'false')

      const response = await api.get(`/api/admin/users?${params}`)
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadGroups = async () => {
    try {
      const response = await api.get('/api/admin/groups')
      setGroups(response.data)
    } catch (error) {
      console.error('Failed to load groups:', error)
    }
  }

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await api.get(`/api/admin/groups/${groupId}`)
      setSelectedGroupMembers(response.data.members || [])
    } catch (error) {
      console.error('Failed to load group members:', error)
    }
  }

  const loadUserAccess = async (userId: string) => {
    try {
      const response = await api.get(`/api/admin/users/${userId}/access`)
      setUserAppAccess(response.data)
    } catch (error) {
      // Endpoint may not exist yet, use empty array
      setUserAppAccess([])
    }
  }

  // ============== Selection ==============

  const selectUser = async (user: UserType) => {
    setSelected({ type: 'user', data: user })
    setSelectedGroupMembers([])
    await loadUserAccess(user.id)
  }

  const selectGroup = async (group: GroupType) => {
    setSelected({ type: 'group', data: group })
    setUserAppAccess([])
    await loadGroupMembers(group.id)
  }

  // ============== User Actions ==============

  const toggleUserAdmin = async (user: UserType) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_admin: !user.is_admin })
      toast.success(user.is_admin ? 'Права администратора сняты' : 'Назначен администратором')
      loadUsers()
      if (selected?.type === 'user' && selected.data.id === user.id) {
        setSelected({ type: 'user', data: { ...user, is_admin: !user.is_admin } })
      }
    } catch (error) {
      toast.error('Не удалось изменить права')
    }
  }

  const toggleUserActive = async (user: UserType) => {
    try {
      await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active })
      toast.success(user.is_active ? 'Пользователь деактивирован' : 'Пользователь активирован')
      loadUsers()
      if (selected?.type === 'user' && selected.data.id === user.id) {
        setSelected({ type: 'user', data: { ...user, is_active: !user.is_active } })
      }
    } catch (error) {
      toast.error('Не удалось изменить статус')
    }
  }

  const removeUserFromGroup = async (userId: string, groupName: string) => {
    const group = groups.find(g => g.name === groupName)
    if (!group) return

    try {
      await api.delete(`/api/admin/groups/${group.id}/members/${userId}`)
      toast.success('Пользователь удалён из группы')
      loadUsers()
      loadGroups()
      if (selected?.type === 'user') {
        const updatedGroups = selected.data.groups.filter(g => g !== groupName)
        setSelected({ type: 'user', data: { ...selected.data, groups: updatedGroups } })
      }
    } catch (error) {
      toast.error('Не удалось удалить из группы')
    }
  }

  const openAddToGroup = async () => {
    if (selected?.type !== 'user') return
    const userGroups = new Set(selected.data.groups)
    setAvailableGroups(groups.filter(g => !userGroups.has(g.name)))
    setShowAddToGroupModal(true)
  }

  const addUserToGroup = async (groupId: string) => {
    if (selected?.type !== 'user') return

    try {
      await api.post(`/api/admin/groups/${groupId}/members`, { user_id: selected.data.id })
      toast.success('Пользователь добавлен в группу')
      setShowAddToGroupModal(false)
      loadUsers()
      loadGroups()
      // Refresh selected user
      const response = await api.get(`/api/admin/users?search=${selected.data.email}`)
      if (response.data.length > 0) {
        setSelected({ type: 'user', data: response.data[0] })
      }
    } catch (error) {
      toast.error('Не удалось добавить в группу')
    }
  }

  // ============== Group Actions ==============

  const openCreateGroup = () => {
    setGroupForm({ name: '', description: '', color: '#E52713' })
    setEditingGroup(null)
    setShowGroupModal(true)
  }

  const openEditGroup = (group: GroupType) => {
    setGroupForm({ name: group.name, description: group.description || '', color: group.color })
    setEditingGroup(group)
    setShowGroupModal(true)
  }

  const saveGroup = async () => {
    setSaving(true)
    try {
      if (editingGroup) {
        await api.patch(`/api/admin/groups/${editingGroup.id}`, groupForm)
        toast.success('Группа обновлена')
      } else {
        await api.post('/api/admin/groups', groupForm)
        toast.success('Группа создана')
      }
      setShowGroupModal(false)
      loadGroups()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (group: GroupType) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление группы',
      message: `Удалить группу "${group.name}"? Все участники будут исключены.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/groups/${group.id}`)
          toast.success('Группа удалена')
          loadGroups()
          loadUsers()
          if (selected?.type === 'group' && selected.data.id === group.id) {
            setSelected(null)
          }
        } catch (error: any) {
          toast.error(error.response?.data?.detail || 'Ошибка удаления')
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const openAddMember = async () => {
    if (selected?.type !== 'group') return
    try {
      const response = await api.get('/api/admin/users?limit=500')
      const memberIds = new Set(selectedGroupMembers.map(m => m.id))
      setAllUsersForAdd(response.data.filter((u: UserType) => !memberIds.has(u.id)))
      setMemberSearch('')
      setShowAddMemberModal(true)
    } catch (error) {
      toast.error('Не удалось загрузить пользователей')
    }
  }

  const addMemberToGroup = async (userId: string) => {
    if (selected?.type !== 'group') return

    try {
      await api.post(`/api/admin/groups/${selected.data.id}/members`, { user_id: userId })
      toast.success('Участник добавлен')
      setShowAddMemberModal(false)
      loadGroups()
      loadGroupMembers(selected.data.id)
    } catch (error) {
      toast.error('Не удалось добавить участника')
    }
  }

  const removeMemberFromGroup = async (userId: string) => {
    if (selected?.type !== 'group') return

    try {
      await api.delete(`/api/admin/groups/${selected.data.id}/members/${userId}`)
      toast.success('Участник удалён')
      loadGroups()
      loadGroupMembers(selected.data.id)
    } catch (error) {
      toast.error('Не удалось удалить участника')
    }
  }

  // ============== Helpers ==============

  const getUserName = (user: UserType | GroupMember) => {
    if (user.last_name && user.first_name) {
      return `${user.last_name} ${user.first_name}`
    }
    return user.display_name || user.email.split('@')[0]
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredUsersForAdd = allUsersForAdd.filter(u => {
    if (!memberSearch) return true
    const search = memberSearch.toLowerCase()
    return (
      u.email.toLowerCase().includes(search) ||
      getUserName(u).toLowerCase().includes(search)
    )
  })

  // ============== Render ==============

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-180px)] gap-6">
      {/* Sidebar */}
      <div className={`bg-white rounded-xl border border-gray-200 flex flex-col ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Search */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E52713]/20 focus:border-[#E52713] outline-none"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Фильтры</div>
            <div className="space-y-1">
              {[
                { key: 'all', label: 'Все', count: users.length },
                { key: 'admins', label: 'Администраторы', count: users.filter(u => u.is_admin).length },
                { key: 'inactive', label: 'Неактивные', count: users.filter(u => !u.is_active).length },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key as typeof filterType)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filterType === f.key
                      ? 'bg-[#FEF2F1] text-[#E52713]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className="text-xs opacity-60">{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Groups */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            {!sidebarCollapsed && (
              <span className="text-xs font-semibold text-gray-400 uppercase">Группы</span>
            )}
            <button
              onClick={openCreateGroup}
              className="p-1 text-[#E52713] hover:bg-[#FEF2F1] rounded transition-colors"
              title="Создать группу"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => selectGroup(group)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected?.type === 'group' && selected.data.id === group.id
                    ? 'bg-[#FEF2F1] text-[#E52713]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{group.name}</span>
                    <span className="text-xs opacity-60">{group.member_count}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <div className="px-4 py-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Пользователи</span>
            </div>
          )}
          <div className="px-2 pb-4 space-y-0.5">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => selectUser(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  selected?.type === 'user' && selected.data.id === user.id
                    ? 'bg-[#FEF2F1]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  user.is_admin ? 'bg-[#FEF2F1]' : 'bg-gray-100'
                }`}>
                  <User className={`h-4 w-4 ${user.is_admin ? 'text-[#E52713]' : 'text-gray-400'}`} />
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <div className={`text-sm font-medium truncate ${
                      !user.is_active ? 'text-gray-400' : 'text-[#5F6062]'
                    }`}>
                      {getUserName(user)}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{user.department || user.email}</div>
                  </div>
                )}
                {!sidebarCollapsed && user.is_admin && (
                  <Shield className="h-4 w-4 text-[#E52713] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Users className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">Выберите пользователя или группу</p>
            <p className="text-sm mt-1">для просмотра деталей</p>
          </div>
        ) : selected.type === 'user' ? (
          <UserDetail
            user={selected.data}
            appAccess={userAppAccess}
            onToggleAdmin={() => toggleUserAdmin(selected.data)}
            onToggleActive={() => toggleUserActive(selected.data)}
            onRemoveFromGroup={(groupName) => removeUserFromGroup(selected.data.id, groupName)}
            onAddToGroup={openAddToGroup}
            formatDate={formatDate}
          />
        ) : (
          <GroupDetail
            group={selected.data}
            members={selectedGroupMembers}
            onEdit={() => openEditGroup(selected.data)}
            onDelete={() => deleteGroup(selected.data)}
            onAddMember={openAddMember}
            onRemoveMember={removeMemberFromGroup}
            getUserName={getUserName}
          />
        )}
      </div>

      {/* Create/Edit Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">
                {editingGroup ? 'Редактирование группы' : 'Новая группа'}
              </h3>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full"
                  placeholder="Название группы"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="w-full"
                  rows={2}
                  placeholder="Опциональное описание"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Цвет</label>
                <div className="flex gap-2">
                  {['#E52713', '#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'].map(color => (
                    <button
                      key={color}
                      onClick={() => setGroupForm({ ...groupForm, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        groupForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowGroupModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium"
              >
                Отмена
              </button>
              <button
                onClick={saveGroup}
                disabled={!groupForm.name || saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 font-medium"
              >
                {saving ? 'Сохранение...' : editingGroup ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Group Modal */}
      {showAddToGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Добавить в группу</h3>
              <button onClick={() => setShowAddToGroupModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto">
              {availableGroups.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Пользователь уже во всех группах</p>
              ) : (
                <div className="space-y-2">
                  {availableGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => addUserToGroup(group.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[#5F6062]">{group.name}</div>
                        {group.description && (
                          <div className="text-sm text-gray-500">{group.description}</div>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">{group.member_count} участников</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Добавить участника</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск пользователя..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {filteredUsersForAdd.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Пользователи не найдены</p>
              ) : (
                <div className="space-y-1">
                  {filteredUsersForAdd.slice(0, 50).map(user => (
                    <button
                      key={user.id}
                      onClick={() => addMemberToGroup(user.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#5F6062] truncate">
                          {getUserName(user)}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Подтвердить"
        danger={confirmDialog.danger}
      />
    </div>
  )
}

// ============== User Detail Component ==============

function UserDetail({
  user,
  appAccess,
  onToggleAdmin,
  onToggleActive,
  onRemoveFromGroup,
  onAddToGroup,
  formatDate,
}: {
  user: UserType
  appAccess: AppAccess[]
  onToggleAdmin: () => void
  onToggleActive: () => void
  onRemoveFromGroup: (groupName: string) => void
  onAddToGroup: () => void
  formatDate: (d: string | null) => string
}) {
  const fullName = [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ') || user.display_name || 'Не указано'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            user.is_admin ? 'bg-[#FEF2F1]' : 'bg-gray-100'
          }`}>
            <User className={`h-8 w-8 ${user.is_admin ? 'text-[#E52713]' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#5F6062]">{fullName}</h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.is_admin && (
                <span className="badge badge-brand">Администратор</span>
              )}
              {user.is_super_admin && (
                <span className="badge bg-purple-100 text-purple-700">Супер-админ</span>
              )}
              <span className={`badge ${user.is_active ? 'badge-success' : 'bg-gray-100 text-gray-500'}`}>
                {user.is_active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Отдел:</span>
            <span className="text-[#5F6062]">{user.department || 'Не указан'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Последний вход:</span>
            <span className="text-[#5F6062]">{formatDate(user.last_login_at)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Email:</span>
            <span className="text-[#5F6062]">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Регистрация:</span>
            <span className="text-[#5F6062]">{formatDate(user.created_at)}</span>
          </div>
        </div>

        {/* Groups */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#5F6062]">Членство в группах</h3>
            <button
              onClick={onAddToGroup}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.groups.length === 0 ? (
              <span className="text-gray-400 text-sm">Не состоит в группах</span>
            ) : (
              user.groups.map(group => (
                <span
                  key={group}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
                >
                  {group}
                  <button
                    onClick={() => onRemoveFromGroup(group)}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* App Access */}
        {appAccess.length > 0 && (
          <div>
            <h3 className="font-semibold text-[#5F6062] mb-3">Доступ к приложениям</h3>
            <div className="space-y-2">
              {appAccess.map(access => (
                <div key={access.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-[#5F6062]">{access.application_name}</span>
                  <span className="text-sm text-gray-500">
                    {access.access_type === 'group' ? `через "${access.group_name}"` : 'напрямую'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button
          onClick={onToggleAdmin}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
            user.is_admin
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-[#E52713] text-white hover:bg-[#C91F0F]'
          }`}
        >
          {user.is_admin ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          {user.is_admin ? 'Снять админа' : 'Сделать админом'}
        </button>
        <button
          onClick={onToggleActive}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
            user.is_active
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          {user.is_active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
          {user.is_active ? 'Деактивировать' : 'Активировать'}
        </button>
      </div>
    </div>
  )
}

// ============== Group Detail Component ==============

function GroupDetail({
  group,
  members,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
  getUserName,
}: {
  group: GroupType
  members: GroupMember[]
  onEdit: () => void
  onDelete: () => void
  onAddMember: () => void
  onRemoveMember: (userId: string) => void
  getUserName: (user: GroupMember) => string
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <Users className="h-8 w-8" style={{ color: group.color }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#5F6062]">{group.name}</h2>
            {group.description && (
              <p className="text-gray-500 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="badge bg-gray-100 text-gray-600">
                {members.length} участников
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
              title="Редактировать"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Удалить"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#5F6062]">Участники группы</h3>
          <button
            onClick={onAddMember}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#E52713] text-white hover:bg-[#C91F0F] rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>В группе нет участников</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#5F6062]">{getUserName(member)}</div>
                  <div className="text-sm text-gray-500 truncate">{member.email}</div>
                </div>
                {member.department && (
                  <span className="text-sm text-gray-400">{member.department}</span>
                )}
                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить из группы"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
