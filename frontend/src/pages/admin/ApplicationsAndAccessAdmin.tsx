import { useEffect, useState } from 'react'
import {
  Search, Plus, X, AppWindow, Globe, Building2, ExternalLink,
  Copy, Check, RefreshCw, Edit2, Trash2, Eye, EyeOff, Shield, Key
} from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

// ============== Types ==============

interface Application {
  id: string
  name: string
  slug: string
  description: string | null
  base_url: string | null
  icon_url: string | null
  client_id: string
  redirect_uris: string[]
  is_active: boolean
  is_public: boolean
  allowed_departments: string[]
  created_at: string
  client_secret?: string
}

// ============== Main Component ==============

export default function ApplicationsAndAccessAdmin() {
  const [applications, setApplications] = useState<Application[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Selection
  const [selected, setSelected] = useState<Application | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSecretModal, setShowSecretModal] = useState<Application | null>(null)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    description: '',
    base_url: '',
    redirect_uris: '',
  })

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    base_url: '',
    redirect_uris: '',
  })

  // Access editing
  const [editingAccess, setEditingAccess] = useState(false)
  const [accessDepartments, setAccessDepartments] = useState<string[]>([])
  const [newDepartment, setNewDepartment] = useState('')

  // Confirmations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    danger?: boolean
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  const [saving, setSaving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // ============== Load Data ==============

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [appsRes, depsRes] = await Promise.all([
        api.get('/api/admin/applications'),
        api.get('/api/admin/departments'),
      ])
      setApplications(appsRes.data)
      setDepartments(depsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  // ============== Filtering ==============

  const filteredApps = applications.filter(app => {
    // Status filter
    if (filterStatus === 'active' && !app.is_active) return false
    if (filterStatus === 'inactive' && app.is_active) return false

    // Search filter
    if (search) {
      const s = search.toLowerCase()
      return (
        app.name.toLowerCase().includes(s) ||
        app.slug.toLowerCase().includes(s) ||
        app.client_id.toLowerCase().includes(s)
      )
    }
    return true
  })

  // ============== Selection ==============

  const selectApp = (app: Application) => {
    setSelected(app)
    setEditingAccess(false)
    setAccessDepartments(app.allowed_departments || [])
  }

  // ============== Create ==============

  const openCreate = () => {
    setCreateForm({
      name: '',
      slug: '',
      description: '',
      base_url: '',
      redirect_uris: '',
    })
    setShowCreateModal(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const response = await api.post('/api/applications/', {
        name: createForm.name,
        slug: createForm.slug,
        description: createForm.description || null,
        base_url: createForm.base_url || null,
        redirect_uris: createForm.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean),
      })
      setShowCreateModal(false)
      setShowSecretModal(response.data)
      toast.success('Приложение создано')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка создания')
    } finally {
      setSaving(false)
    }
  }

  // ============== Edit ==============

  const openEdit = () => {
    if (!selected) return
    setEditForm({
      name: selected.name,
      description: selected.description || '',
      base_url: selected.base_url || '',
      redirect_uris: selected.redirect_uris.join('\n'),
    })
    setShowEditModal(true)
  }

  const handleEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.put(`/api/applications/${selected.id}`, {
        name: editForm.name,
        description: editForm.description || null,
        base_url: editForm.base_url || null,
        redirect_uris: editForm.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean),
      })
      toast.success('Приложение обновлено')
      setShowEditModal(false)
      loadData()
      // Update selected
      setSelected({
        ...selected,
        name: editForm.name,
        description: editForm.description || null,
        base_url: editForm.base_url || null,
        redirect_uris: editForm.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean),
      })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления')
    } finally {
      setSaving(false)
    }
  }

  // ============== Toggle Status ==============

  const toggleActive = async () => {
    if (!selected) return
    try {
      await api.put(`/api/applications/${selected.id}`, { is_active: !selected.is_active })
      toast.success(selected.is_active ? 'Приложение деактивировано' : 'Приложение активировано')
      loadData()
      setSelected({ ...selected, is_active: !selected.is_active })
    } catch (error) {
      toast.error('Ошибка изменения статуса')
    }
  }

  const togglePublic = async () => {
    if (!selected) return
    try {
      await api.put(`/api/applications/${selected.id}`, { is_public: !selected.is_public })
      toast.success(selected.is_public ? 'Приложение скрыто' : 'Приложение стало публичным')
      loadData()
      setSelected({ ...selected, is_public: !selected.is_public })
    } catch (error) {
      toast.error('Ошибка изменения видимости')
    }
  }

  // ============== Regenerate Secret ==============

  const confirmRegenerateSecret = () => {
    if (!selected) return
    setConfirmDialog({
      isOpen: true,
      title: 'Перегенерация секрета',
      message: `Старый секрет для "${selected.name}" перестанет работать немедленно. Продолжить?`,
      danger: true,
      onConfirm: async () => {
        try {
          const response = await api.post(`/api/applications/${selected.id}/regenerate-secret`)
          setShowSecretModal(response.data)
          toast.success('Секрет перегенерирован')
        } catch (error) {
          toast.error('Ошибка перегенерации')
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // ============== Delete ==============

  const confirmDelete = () => {
    if (!selected) return
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление приложения',
      message: `Удалить приложение "${selected.name}"? Это действие нельзя отменить.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/applications/${selected.id}`, { params: { permanent: true } })
          toast.success('Приложение удалено')
          setSelected(null)
          loadData()
        } catch (error) {
          toast.error('Ошибка удаления')
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // ============== Access Management ==============

  const startEditAccess = () => {
    if (!selected) return
    setAccessDepartments(selected.allowed_departments || [])
    setEditingAccess(true)
  }

  const toggleDepartment = (dept: string) => {
    if (accessDepartments.includes(dept)) {
      setAccessDepartments(accessDepartments.filter(d => d !== dept))
    } else {
      setAccessDepartments([...accessDepartments, dept])
    }
  }

  const addCustomDepartment = () => {
    if (!newDepartment.trim()) return
    if (!accessDepartments.includes(newDepartment.trim())) {
      setAccessDepartments([...accessDepartments, newDepartment.trim()])
    }
    setNewDepartment('')
  }

  const setAllAccess = () => {
    setAccessDepartments([])
  }

  const saveAccess = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.patch(`/api/admin/applications/${selected.id}/departments`, accessDepartments)
      toast.success('Настройки доступа сохранены')
      setEditingAccess(false)
      loadData()
      setSelected({ ...selected, allowed_departments: accessDepartments })
    } catch (error) {
      toast.error('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const cancelEditAccess = () => {
    setAccessDepartments(selected?.allowed_departments || [])
    setEditingAccess(false)
  }

  // ============== Helpers ==============

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

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
      <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col">
        {/* Search */}
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

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Фильтры</div>
          <div className="space-y-1">
            {[
              { key: 'all', label: 'Все', count: applications.length },
              { key: 'active', label: 'Активные', count: applications.filter(a => a.is_active).length },
              { key: 'inactive', label: 'Неактивные', count: applications.filter(a => !a.is_active).length },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key as typeof filterStatus)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterStatus === f.key
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

        {/* Create Button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={openCreate}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Новое приложение
          </button>
        </div>

        {/* Apps List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredApps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <AppWindow className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Приложения не найдены</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredApps.map(app => (
                <button
                  key={app.id}
                  onClick={() => selectApp(app)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                    selected?.id === app.id
                      ? 'bg-[#FEF2F1]'
                      : 'hover:bg-gray-50'
                  } ${!app.is_active ? 'opacity-50' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    app.is_active ? 'bg-[#FEF2F1]' : 'bg-gray-100'
                  }`}>
                    {app.icon_url ? (
                      <img src={app.icon_url} alt="" className="w-6 h-6 rounded" />
                    ) : (
                      <AppWindow className={`h-5 w-5 ${app.is_active ? 'text-[#E52713]' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#5F6062] truncate">{app.name}</div>
                    <div className="text-xs text-gray-400 truncate">{app.slug}</div>
                  </div>
                  {(app.allowed_departments || []).length > 0 && (
                    <span title="Ограниченный доступ">
                      <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <AppWindow className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">Выберите приложение</p>
            <p className="text-sm mt-1">для просмотра настроек</p>
          </div>
        ) : (
          <AppDetail
            app={selected}
            departments={departments}
            editingAccess={editingAccess}
            accessDepartments={accessDepartments}
            newDepartment={newDepartment}
            setNewDepartment={setNewDepartment}
            copiedField={copiedField}
            saving={saving}
            onCopy={copyToClipboard}
            onEdit={openEdit}
            onToggleActive={toggleActive}
            onTogglePublic={togglePublic}
            onRegenerateSecret={confirmRegenerateSecret}
            onDelete={confirmDelete}
            onStartEditAccess={startEditAccess}
            onToggleDepartment={toggleDepartment}
            onAddCustomDepartment={addCustomDepartment}
            onSetAllAccess={setAllAccess}
            onSaveAccess={saveAccess}
            onCancelEditAccess={cancelEditAccess}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Новое приложение</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full"
                  placeholder="Моё приложение"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Slug *</label>
                <input
                  type="text"
                  value={createForm.slug}
                  onChange={e => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full"
                  placeholder="my-app"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Base URL</label>
                <input
                  type="url"
                  value={createForm.base_url}
                  onChange={e => setCreateForm({ ...createForm, base_url: e.target.value })}
                  className="w-full"
                  placeholder="https://myapp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Redirect URIs (по одному на строку)</label>
                <textarea
                  value={createForm.redirect_uris}
                  onChange={e => setCreateForm({ ...createForm, redirect_uris: e.target.value })}
                  className="w-full font-mono text-sm"
                  rows={3}
                  placeholder="https://myapp.example.com/callback"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium">
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || !createForm.slug || saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 font-medium"
              >
                {saving ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Редактирование</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Base URL</label>
                <input
                  type="url"
                  value={editForm.base_url}
                  onChange={e => setEditForm({ ...editForm, base_url: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Redirect URIs</label>
                <textarea
                  value={editForm.redirect_uris}
                  onChange={e => setEditForm({ ...editForm, redirect_uris: e.target.value })}
                  className="w-full font-mono text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium">
                Отмена
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 font-medium"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-emerald-700">Учётные данные</h3>
              <button onClick={() => setShowSecretModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm font-medium">
                  Сохраните Client Secret сейчас! Он больше не будет показан.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Client ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 p-3 rounded-xl font-mono text-sm break-all">
                    {showSecretModal.client_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(showSecretModal.client_id, 'modal-cid')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {copiedField === 'modal-cid' ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Client Secret</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-emerald-50 border border-emerald-200 p-3 rounded-xl font-mono text-sm break-all text-emerald-800">
                    {showSecretModal.client_secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(showSecretModal.client_secret!, 'modal-secret')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {copiedField === 'modal-secret' ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowSecretModal(null)}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] font-medium"
              >
                Я сохранил данные
              </button>
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

// ============== App Detail Component ==============

function AppDetail({
  app,
  departments,
  editingAccess,
  accessDepartments,
  newDepartment,
  setNewDepartment,
  copiedField,
  saving,
  onCopy,
  onEdit,
  onToggleActive,
  onTogglePublic,
  onRegenerateSecret,
  onDelete,
  onStartEditAccess,
  onToggleDepartment,
  onAddCustomDepartment,
  onSetAllAccess,
  onSaveAccess,
  onCancelEditAccess,
}: {
  app: Application
  departments: string[]
  editingAccess: boolean
  accessDepartments: string[]
  newDepartment: string
  setNewDepartment: (v: string) => void
  copiedField: string | null
  saving: boolean
  onCopy: (text: string, field: string) => void
  onEdit: () => void
  onToggleActive: () => void
  onTogglePublic: () => void
  onRegenerateSecret: () => void
  onDelete: () => void
  onStartEditAccess: () => void
  onToggleDepartment: (dept: string) => void
  onAddCustomDepartment: () => void
  onSetAllAccess: () => void
  onSaveAccess: () => void
  onCancelEditAccess: () => void
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            app.is_active ? 'bg-[#FEF2F1]' : 'bg-gray-100'
          }`}>
            {app.icon_url ? (
              <img src={app.icon_url} alt="" className="w-10 h-10 rounded-xl" />
            ) : (
              <AppWindow className={`h-8 w-8 ${app.is_active ? 'text-[#E52713]' : 'text-gray-400'}`} />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#5F6062]">{app.name}</h2>
            <p className="text-gray-500">{app.slug}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onToggleActive}
                className={`badge ${app.is_active ? 'badge-success' : 'bg-gray-100 text-gray-500'} cursor-pointer`}
              >
                {app.is_active ? 'Активно' : 'Неактивно'}
              </button>
              <button
                onClick={onTogglePublic}
                className={`badge flex items-center gap-1 cursor-pointer ${
                  app.is_public ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {app.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {app.is_public ? 'Публичное' : 'Приватное'}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg" title="Редактировать">
              <Edit2 className="h-5 w-5" />
            </button>
            <button onClick={onDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Удалить">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        {app.description && (
          <p className="mt-4 text-gray-600">{app.description}</p>
        )}
        {app.base_url && (
          <a
            href={app.base_url}
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1 text-sm text-[#E52713] hover:underline"
          >
            {app.base_url} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* OAuth2 Credentials */}
        <div>
          <h3 className="font-semibold text-[#5F6062] mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" />
            OAuth2 учётные данные
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client ID</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm break-all">
                  {app.client_id}
                </code>
                <button
                  onClick={() => onCopy(app.client_id, 'cid')}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  {copiedField === 'cid' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {app.redirect_uris.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Redirect URIs</label>
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  {app.redirect_uris.map((uri, i) => (
                    <div key={i} className="font-mono text-sm text-gray-700 break-all">
                      {uri}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onRegenerateSecret}
              className="flex items-center gap-2 px-4 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Перегенерировать секрет
            </button>
          </div>
        </div>

        {/* Access Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#5F6062] flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Настройки доступа
            </h3>
            {!editingAccess && (
              <button
                onClick={onStartEditAccess}
                className="text-sm text-[#E52713] hover:underline"
              >
                Изменить
              </button>
            )}
          </div>

          {!editingAccess ? (
            <div className="bg-gray-50 rounded-xl p-4">
              {(app.allowed_departments || []).length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <Globe className="h-5 w-5" />
                  <span>Доступно всем сотрудникам</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-amber-700 mb-3">
                    <Building2 className="h-5 w-5" />
                    <span>Ограничен по департаментам:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {app.allowed_departments.map(dept => (
                      <span key={dept} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm">
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              {/* All access button */}
              <button
                onClick={onSetAllAccess}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  accessDepartments.length === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                Доступно всем
              </button>

              {/* Selected departments */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Департаменты с доступом:</p>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {accessDepartments.length === 0 ? (
                    <span className="text-gray-400 text-sm">Нет ограничений</span>
                  ) : (
                    accessDepartments.map(dept => (
                      <span
                        key={dept}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#E52713] text-white rounded-full text-sm"
                      >
                        {dept}
                        <button onClick={() => onToggleDepartment(dept)} className="hover:bg-white/20 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Available departments */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Добавить:</p>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
                  {departments
                    .filter(d => !accessDepartments.includes(d))
                    .map(dept => (
                      <button
                        key={dept}
                        onClick={() => onToggleDepartment(dept)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-full text-sm"
                      >
                        <Plus className="h-3 w-3" />
                        {dept}
                      </button>
                    ))}
                </div>
              </div>

              {/* Custom department */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Другой департамент..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && onAddCustomDepartment()}
                />
                <button
                  onClick={onAddCustomDepartment}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Save/Cancel */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <button
                  onClick={onCancelEditAccess}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={onSaveAccess}
                  disabled={saving}
                  className="px-4 py-2 bg-[#E52713] text-white rounded-lg hover:bg-[#C91F0F] disabled:opacity-50 font-medium"
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OAuth2 Endpoints Info */}
        <div>
          <h3 className="font-semibold text-[#5F6062] mb-3">OAuth2 Endpoints</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            {[
              { label: 'Authorize', path: '/oauth/authorize' },
              { label: 'Token', path: '/oauth/token' },
              { label: 'UserInfo', path: '/oauth/userinfo' },
            ].map(ep => (
              <div key={ep.label} className="flex items-center gap-2">
                <span className="text-gray-500 w-20">{ep.label}:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs flex-1">
                  {window.location.origin}{ep.path}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
