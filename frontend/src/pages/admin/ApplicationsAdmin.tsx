import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Copy, Check, ExternalLink, Eye, EyeOff, Trash2, Edit2, X } from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

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
  created_at: string
  client_secret?: string
}

interface CreateAppForm {
  name: string
  slug: string
  description: string
  base_url: string
  redirect_uris: string
}

export default function ApplicationsAdmin() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSecretModal, setShowSecretModal] = useState<Application | null>(null)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [deletingApp, setDeletingApp] = useState<Application | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<CreateAppForm>({
    name: '',
    slug: '',
    description: '',
    base_url: '',
    redirect_uris: '',
  })
  const [saving, setSaving] = useState(false)

  // Confirm dialogs state
  const [regenerateConfirm, setRegenerateConfirm] = useState<{ isOpen: boolean; app: Application | null }>({
    isOpen: false,
    app: null
  })
  const [regenerateLoading, setRegenerateLoading] = useState(false)

  useEffect(() => {
    loadApps()
  }, [])

  const loadApps = async () => {
    try {
      const response = await api.get('/api/admin/applications')
      setApps(response.data)
    } catch (error) {
      console.error('Failed to load apps:', error)
      toast.error('Не удалось загрузить приложения')
    } finally {
      setLoading(false)
    }
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
      setCreateForm({ name: '', slug: '', description: '', base_url: '', redirect_uris: '' })
      toast.success('Приложение успешно создано')
      loadApps()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Не удалось создать приложение')
    } finally {
      setSaving(false)
    }
  }

  const confirmRegenerateSecret = (app: Application) => {
    setRegenerateConfirm({ isOpen: true, app })
  }

  const handleRegenerateSecret = async () => {
    if (!regenerateConfirm.app) return

    setRegenerateLoading(true)
    try {
      const response = await api.post(`/api/applications/${regenerateConfirm.app.id}/regenerate-secret`)
      setShowSecretModal(response.data)
      toast.success('Секрет успешно перегенерирован')
    } catch (error) {
      console.error('Failed to regenerate secret:', error)
      toast.error('Не удалось перегенерировать секрет')
    } finally {
      setRegenerateLoading(false)
      setRegenerateConfirm({ isOpen: false, app: null })
    }
  }

  const handleToggleActive = async (app: Application) => {
    try {
      await api.put(`/api/applications/${app.id}`, {
        is_active: !app.is_active
      })
      toast.success(app.is_active ? 'Приложение деактивировано' : 'Приложение активировано')
      loadApps()
    } catch (error) {
      console.error('Failed to toggle app:', error)
      toast.error('Не удалось изменить статус приложения')
    }
  }

  const handleTogglePublic = async (app: Application) => {
    try {
      await api.put(`/api/applications/${app.id}`, {
        is_public: !app.is_public
      })
      toast.success(app.is_public ? 'Приложение скрыто' : 'Приложение стало публичным')
      loadApps()
    } catch (error) {
      console.error('Failed to toggle public:', error)
      toast.error('Не удалось изменить видимость приложения')
    }
  }

  const handleUpdate = async () => {
    if (!editingApp) return
    setSaving(true)
    try {
      await api.put(`/api/applications/${editingApp.id}`, {
        name: editingApp.name,
        description: editingApp.description,
        base_url: editingApp.base_url,
        redirect_uris: editingApp.redirect_uris,
      })
      setEditingApp(null)
      toast.success('Приложение успешно обновлено')
      loadApps()
    } catch (error) {
      console.error('Failed to update app:', error)
      toast.error('Не удалось обновить приложение')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (permanent: boolean) => {
    if (!deletingApp) return
    try {
      await api.delete(`/api/applications/${deletingApp.id}`, {
        params: { permanent }
      })
      toast.success(permanent ? 'Приложение удалено' : 'Приложение деактивировано')
      setDeletingApp(null)
      loadApps()
    } catch (error) {
      console.error('Failed to delete app:', error)
      toast.error('Не удалось удалить приложение')
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">OAuth2 приложения</h1>
          <p className="text-gray-500 mt-1">Управление OAuth2 клиентами</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Новое приложение
        </button>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Приложение
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Client ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Видимость
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.map(app => (
              <tr key={app.id} className={`${!app.is_active ? 'bg-gray-50 opacity-60' : ''} hover:bg-gray-50 transition-colors`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {app.icon_url && (
                      <img src={app.icon_url} alt="" className="h-8 w-8 rounded-lg mr-3" />
                    )}
                    <div>
                      <div className="font-medium text-[#5F6062]">{app.name}</div>
                      <div className="text-sm text-gray-500">{app.slug}</div>
                      {app.base_url && (
                        <a href={app.base_url} target="_blank" rel="noopener" className="text-xs text-[#E52713] hover:underline flex items-center gap-1">
                          {app.base_url} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                      {app.client_id.substring(0, 20)}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(app.client_id, `cid-${app.id}`)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      {copiedField === `cid-${app.id}` ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(app)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      app.is_active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {app.is_active ? 'Активно' : 'Неактивно'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleTogglePublic(app)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      app.is_public
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {app.is_public ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {app.is_public ? 'Публичное' : 'Приватное'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => confirmRegenerateSecret(app)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Перегенерировать секрет"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingApp(app)}
                      className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingApp(app)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-[#5F6062] mb-4">OAuth2 Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-[#5F6062] mb-1">URL авторизации:</p>
            <code className="block bg-gray-100 p-2 rounded-lg">{window.location.origin}/oauth/authorize</code>
          </div>
          <div>
            <p className="font-medium text-[#5F6062] mb-1">URL получения токена:</p>
            <code className="block bg-gray-100 p-2 rounded-lg">{window.location.origin}/oauth/token</code>
          </div>
          <div>
            <p className="font-medium text-[#5F6062] mb-1">URL информации о пользователе:</p>
            <code className="block bg-gray-100 p-2 rounded-lg">{window.location.origin}/oauth/userinfo</code>
          </div>
          <div>
            <p className="font-medium text-[#5F6062] mb-1">OpenID Configuration:</p>
            <code className="block bg-gray-100 p-2 rounded-lg">{window.location.origin}/.well-known/openid-configuration</code>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Новое OAuth2 приложение</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                  placeholder="Описание приложения"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Базовый URL</label>
                <input
                  type="url"
                  value={createForm.base_url}
                  onChange={e => setCreateForm({ ...createForm, base_url: e.target.value })}
                  className="w-full"
                  placeholder="https://myapp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Redirect URI (по одному на строку)</label>
                <textarea
                  value={createForm.redirect_uris}
                  onChange={e => setCreateForm({ ...createForm, redirect_uris: e.target.value })}
                  className="w-full font-mono text-sm"
                  rows={3}
                  placeholder="https://myapp.example.com/auth/callback&#10;http://localhost:3000/auth/callback"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || !createForm.slug || saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Создание...' : 'Создать'}
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
              <h3 className="text-xl font-bold text-emerald-700">Учётные данные клиента</h3>
              <button onClick={() => setShowSecretModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm font-medium">
                  Сохраните эти данные сейчас! Client Secret больше не будет показан.
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
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copiedField === 'modal-secret' ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-[#5F6062] mb-2">Пример .env конфигурации:</p>
                <pre className="bg-gray-800 text-emerald-400 p-3 rounded-lg overflow-x-auto">
{`HUB_CLIENT_ID=${showSecretModal.client_id}
HUB_CLIENT_SECRET=${showSecretModal.client_secret}
HUB_AUTHORIZE_URL=${window.location.origin}/oauth/authorize
HUB_TOKEN_URL=${window.location.origin}/oauth/token
HUB_USERINFO_URL=${window.location.origin}/oauth/userinfo`}
                </pre>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowSecretModal(null)}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
              >
                Я сохранил учётные данные
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-red-600">Удаление приложения</h3>
              <button onClick={() => setDeletingApp(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[#5F6062]">
                Выберите действие для приложения <span className="font-semibold">"{deletingApp.name}"</span>:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleDelete(false)}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="font-medium text-[#5F6062]">Деактивировать</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Приложение станет неактивным, но останется в базе. Можно будет активировать снова.
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(true)}
                  className="w-full p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-left"
                >
                  <div className="font-medium text-red-600">Удалить полностью</div>
                  <div className="text-sm text-red-500 mt-1">
                    Приложение будет удалено из базы данных навсегда. Это действие нельзя отменить.
                  </div>
                </button>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDeletingApp(null)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">Редактирование приложения</h3>
              <button onClick={() => setEditingApp(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название</label>
                <input
                  type="text"
                  value={editingApp.name}
                  onChange={e => setEditingApp({ ...editingApp, name: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={editingApp.description || ''}
                  onChange={e => setEditingApp({ ...editingApp, description: e.target.value })}
                  className="w-full"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Базовый URL</label>
                <input
                  type="url"
                  value={editingApp.base_url || ''}
                  onChange={e => setEditingApp({ ...editingApp, base_url: e.target.value })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Redirect URI (по одному на строку)</label>
                <textarea
                  value={editingApp.redirect_uris.join('\n')}
                  onChange={e => setEditingApp({ ...editingApp, redirect_uris: e.target.value.split('\n').filter(Boolean) })}
                  className="w-full font-mono text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setEditingApp(null)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Secret Confirmation Dialog */}
      <ConfirmDialog
        isOpen={regenerateConfirm.isOpen}
        onClose={() => setRegenerateConfirm({ isOpen: false, app: null })}
        onConfirm={handleRegenerateSecret}
        title="Перегенерация секрета"
        message={`Вы уверены, что хотите перегенерировать секрет для "${regenerateConfirm.app?.name}"? Старый секрет перестанет работать немедленно.`}
        confirmText="Перегенерировать"
        cancelText="Отмена"
        danger
        loading={regenerateLoading}
      />
    </div>
  )
}
