import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Users, X } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface Group {
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

interface User {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
}

export default function GroupsAdmin() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState('#E52713')

  // Confirm dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; group: Group | null }>({
    isOpen: false,
    group: null
  })
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadGroups()
    loadAllUsers()
  }, [])

  const loadGroups = async () => {
    try {
      const response = await api.get('/api/admin/groups')
      setGroups(response.data)
    } catch (error) {
      console.error('Failed to load groups:', error)
      toast.error('Не удалось загрузить группы')
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/api/admin/users?limit=500')
      setAllUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Не удалось загрузить пользователей')
    }
  }

  const loadGroupMembers = async (group: Group) => {
    try {
      const response = await api.get(`/api/admin/groups/${group.id}`)
      setSelectedGroup(response.data)
      setShowMembersModal(true)
    } catch (error) {
      console.error('Failed to load group members:', error)
      toast.error('Не удалось загрузить участников группы')
    }
  }

  const handleCreateGroup = async () => {
    try {
      await api.post('/api/admin/groups', {
        name: formName,
        description: formDescription || null,
        color: formColor
      })
      setShowCreateModal(false)
      resetForm()
      toast.success('Группа успешно создана')
      loadGroups()
    } catch (error) {
      console.error('Failed to create group:', error)
      toast.error('Не удалось создать группу')
    }
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return

    try {
      await api.patch(`/api/admin/groups/${selectedGroup.id}`, {
        name: formName,
        description: formDescription || null,
        color: formColor
      })
      setShowEditModal(false)
      resetForm()
      toast.success('Группа успешно обновлена')
      loadGroups()
    } catch (error) {
      console.error('Failed to update group:', error)
      toast.error('Не удалось обновить группу')
    }
  }

  const confirmDeleteGroup = (group: Group) => {
    setDeleteConfirm({ isOpen: true, group })
  }

  const handleDeleteGroup = async () => {
    if (!deleteConfirm.group) return

    setDeleteLoading(true)
    try {
      await api.delete(`/api/admin/groups/${deleteConfirm.group.id}`)
      toast.success('Группа успешно удалена')
      loadGroups()
    } catch (error) {
      console.error('Failed to delete group:', error)
      toast.error('Не удалось удалить группу')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm({ isOpen: false, group: null })
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return

    try {
      await api.post(`/api/admin/groups/${selectedGroup.id}/members`, {
        user_ids: [userId],
        group_id: selectedGroup.id,
        action: 'add'
      })
      toast.success('Участник добавлен')
      loadGroupMembers(selectedGroup)
      loadGroups()
    } catch (error) {
      console.error('Failed to add member:', error)
      toast.error('Не удалось добавить участника')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return

    try {
      await api.post(`/api/admin/groups/${selectedGroup.id}/members`, {
        user_ids: [userId],
        group_id: selectedGroup.id,
        action: 'remove'
      })
      toast.success('Участник удален')
      loadGroupMembers(selectedGroup)
      loadGroups()
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Не удалось удалить участника')
    }
  }

  const openEditModal = (group: Group) => {
    setSelectedGroup(group)
    setFormName(group.name)
    setFormDescription(group.description || '')
    setFormColor(group.color)
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormColor('#E52713')
    setSelectedGroup(null)
  }

  const getUserName = (user: GroupMember | User) => {
    if ('last_name' in user && user.last_name && 'first_name' in user && user.first_name) {
      return `${user.last_name} ${user.first_name}`
    }
    return user.display_name || user.email.split('@')[0]
  }

  const colors = [
    '#E52713', '#5F6062', '#8b5cf6', '#ec4899',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6b7280'
  ]

  const getMemberCountText = (count: number): string => {
    const lastDigit = count % 10
    const lastTwoDigits = count % 100
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'участников'
    if (lastDigit === 1) return 'участник'
    if (lastDigit >= 2 && lastDigit <= 4) return 'участника'
    return 'участников'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Группы</h1>
          <p className="text-gray-500 mt-1">Управление группами доступа</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Создать группу
        </button>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 spinner"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Групп пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Создайте первую группу для организации пользователей</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-[#E52713] transition-colors">
              <div className="h-2" style={{ backgroundColor: group.color }}></div>
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#5F6062] text-lg">{group.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{group.description || 'Без описания'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(group)}
                      className="p-2 text-gray-400 hover:text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => confirmDeleteGroup(group)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => loadGroupMembers(group)}
                    className="flex items-center gap-2 text-sm text-[#E52713] hover:text-[#C91F0F] font-medium"
                  >
                    <Users className="h-4 w-4" />
                    {group.member_count} {getMemberCountText(group.member_count)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#5F6062]">
                {showCreateModal ? 'Создание группы' : 'Редактирование группы'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full"
                  placeholder="Название группы"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full"
                  placeholder="Описание (необязательно)"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Цвет</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formColor === color ? 'ring-2 ring-offset-2 ring-[#E52713] scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={showCreateModal ? handleCreateGroup : handleUpdateGroup}
                disabled={!formName.trim()}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {showCreateModal ? 'Создать' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#5F6062]">
                  Участники группы
                </h2>
                <p className="text-gray-500 text-sm mt-1">{selectedGroup.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowMembersModal(false)
                  setSelectedGroup(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {/* Current Members */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#5F6062] mb-3">
                  Текущие участники ({selectedGroup.members?.length || 0})
                </h3>
                {selectedGroup.members && selectedGroup.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                        <div>
                          <p className="font-medium text-[#5F6062]">{getUserName(member)}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Участников пока нет</p>
                )}
              </div>

              {/* Add Members */}
              <div>
                <h3 className="text-sm font-semibold text-[#5F6062] mb-3">Добавить участников</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {allUsers
                    .filter(u => !selectedGroup.members?.find(m => m.id === u.id))
                    .map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div>
                          <p className="font-medium text-[#5F6062]">{getUserName(user)}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <button
                          onClick={() => handleAddMember(user.id)}
                          className="px-3 py-1.5 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg text-sm font-medium transition-colors"
                        >
                          Добавить
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowMembersModal(false)
                  setSelectedGroup(null)
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, group: null })}
        onConfirm={handleDeleteGroup}
        title="Удаление группы"
        message={`Вы уверены, что хотите удалить группу "${deleteConfirm.group?.name}"? Это удалит все связи с пользователями.`}
        confirmText="Удалить"
        cancelText="Отмена"
        danger
        loading={deleteLoading}
      />
    </div>
  )
}
