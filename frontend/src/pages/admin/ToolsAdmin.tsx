import { useEffect, useState } from 'react'
import {
  Plus, Server, Wrench, RefreshCw, Trash2, Edit2, X, Check, Copy,
  Activity, AlertCircle, CheckCircle, Settings
} from 'lucide-react'
import { api } from '../../api/client'
import { toast } from '../../store/toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

// ============== Types ==============

interface ToolServer {
  id: string
  name: string
  description: string | null
  base_url: string
  api_key: string
  health_check_endpoint: string
  timeout_seconds: number
  is_active: boolean
  is_healthy: boolean
  last_health_check: string | null
  last_error: string | null
  tools_count?: number
  created_at: string
}

interface Tool {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  server_id: string | null
  endpoint: string | null
  http_method: string
  request_schema: object | null
  response_type: string
  is_active: boolean
  is_public: boolean
  allowed_departments: string[]
  usage_count: number
  last_used_at: string | null
  sort_order: number
  server?: ToolServer | null
  created_at: string
}

// ============== Color Presets ==============

const PRESET_COLORS = [
  '#E52713', '#10B981', '#6366F1', '#F59E0B', '#EC4899',
  '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
]

// ============== Main Component ==============

export default function ToolsAdmin() {
  const [activeTab, setActiveTab] = useState<'servers' | 'tools'>('tools')
  const [servers, setServers] = useState<ToolServer[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showServerModal, setShowServerModal] = useState(false)
  const [editingServer, setEditingServer] = useState<ToolServer | null>(null)
  const [showToolModal, setShowToolModal] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)

  // Confirm dialogs
  const [deleteServerConfirm, setDeleteServerConfirm] = useState<{ isOpen: boolean; server: ToolServer | null }>({
    isOpen: false, server: null
  })
  const [deleteToolConfirm, setDeleteToolConfirm] = useState<{ isOpen: boolean; tool: Tool | null }>({
    isOpen: false, tool: null
  })

  const [saving, setSaving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Forms
  const [serverForm, setServerForm] = useState({
    name: '',
    description: '',
    base_url: '',
    health_check_endpoint: '/health',
    timeout_seconds: 30,
  })

  const [toolForm, setToolForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Wrench',
    color: '#6366F1',
    server_id: '',
    endpoint: '',
    http_method: 'POST',
    response_type: 'json',
    is_active: true,
    is_public: true,
    sort_order: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [serversRes, toolsRes] = await Promise.all([
        api.get('/api/tools/admin/servers'),
        api.get('/api/tools/admin/list'),
      ])
      setServers(serversRes.data)
      setTools(toolsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // ============== Server handlers ==============

  const openCreateServer = () => {
    setServerForm({
      name: '',
      description: '',
      base_url: '',
      health_check_endpoint: '/health',
      timeout_seconds: 30,
    })
    setEditingServer(null)
    setShowServerModal(true)
  }

  const openEditServer = (server: ToolServer) => {
    setServerForm({
      name: server.name,
      description: server.description || '',
      base_url: server.base_url,
      health_check_endpoint: server.health_check_endpoint,
      timeout_seconds: server.timeout_seconds,
    })
    setEditingServer(server)
    setShowServerModal(true)
  }

  const handleSaveServer = async () => {
    setSaving(true)
    try {
      if (editingServer) {
        await api.patch(`/api/tools/admin/servers/${editingServer.id}`, serverForm)
        toast.success('Сервер обновлён')
      } else {
        await api.post('/api/tools/admin/servers', serverForm)
        toast.success('Сервер создан')
      }
      setShowServerModal(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteServer = async () => {
    if (!deleteServerConfirm.server) return
    try {
      await api.delete(`/api/tools/admin/servers/${deleteServerConfirm.server.id}`)
      toast.success('Сервер удалён')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления')
    } finally {
      setDeleteServerConfirm({ isOpen: false, server: null })
    }
  }

  const handleCheckHealth = async (server: ToolServer) => {
    try {
      const res = await api.post(`/api/tools/admin/servers/${server.id}/check-health`)
      if (res.data.is_healthy) {
        toast.success('Сервер доступен')
      } else {
        toast.error(`Сервер недоступен: ${res.data.last_error}`)
      }
      loadData()
    } catch (error) {
      toast.error('Ошибка проверки')
    }
  }

  const handleRegenerateKey = async (server: ToolServer) => {
    try {
      await api.post(`/api/tools/admin/servers/${server.id}/regenerate-key`)
      toast.success('API ключ перегенерирован')
      loadData()
    } catch (error) {
      toast.error('Ошибка перегенерации')
    }
  }

  // ============== Tool handlers ==============

  const openCreateTool = () => {
    setToolForm({
      name: '',
      slug: '',
      description: '',
      icon: 'Wrench',
      color: '#6366F1',
      server_id: '',
      endpoint: '',
      http_method: 'POST',
      response_type: 'json',
      is_active: true,
      is_public: true,
      sort_order: tools.length,
    })
    setEditingTool(null)
    setShowToolModal(true)
  }

  const openEditTool = (tool: Tool) => {
    setToolForm({
      name: tool.name,
      slug: tool.slug,
      description: tool.description || '',
      icon: tool.icon,
      color: tool.color,
      server_id: tool.server_id || '',
      endpoint: tool.endpoint || '',
      http_method: tool.http_method,
      response_type: tool.response_type,
      is_active: tool.is_active,
      is_public: tool.is_public,
      sort_order: tool.sort_order,
    })
    setEditingTool(tool)
    setShowToolModal(true)
  }

  const handleSaveTool = async () => {
    setSaving(true)
    try {
      const data = {
        ...toolForm,
        server_id: toolForm.server_id || null,
        endpoint: toolForm.endpoint || null,
      }

      if (editingTool) {
        await api.patch(`/api/tools/admin/${editingTool.id}`, data)
        toast.success('Инструмент обновлён')
      } else {
        await api.post('/api/tools/admin', data)
        toast.success('Инструмент создан')
      }
      setShowToolModal(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTool = async () => {
    if (!deleteToolConfirm.tool) return
    try {
      await api.delete(`/api/tools/admin/${deleteToolConfirm.tool.id}`)
      toast.success('Инструмент удалён')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления')
    } finally {
      setDeleteToolConfirm({ isOpen: false, tool: null })
    }
  }

  const handleToggleToolActive = async (tool: Tool) => {
    try {
      await api.patch(`/api/tools/admin/${tool.id}`, { is_active: !tool.is_active })
      toast.success(tool.is_active ? 'Инструмент отключён' : 'Инструмент включён')
      loadData()
    } catch (error) {
      toast.error('Ошибка изменения статуса')
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Инструменты</h1>
          <p className="text-gray-500 mt-1">Управление инструментами и серверами</p>
        </div>
        <button
          onClick={activeTab === 'servers' ? openCreateServer : openCreateTool}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          {activeTab === 'servers' ? 'Новый сервер' : 'Новый инструмент'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'tools'
              ? 'border-[#E52713] text-[#E52713]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wrench className="h-5 w-5" />
          Инструменты ({tools.length})
        </button>
        <button
          onClick={() => setActiveTab('servers')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
            activeTab === 'servers'
              ? 'border-[#E52713] text-[#E52713]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Server className="h-5 w-5" />
          Сервера ({servers.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'servers' ? (
        <ServersTable
          servers={servers}
          onEdit={openEditServer}
          onDelete={(s) => setDeleteServerConfirm({ isOpen: true, server: s })}
          onCheckHealth={handleCheckHealth}
          onRegenerateKey={handleRegenerateKey}
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />
      ) : (
        <ToolsTable
          tools={tools}
          servers={servers}
          onEdit={openEditTool}
          onDelete={(t) => setDeleteToolConfirm({ isOpen: true, tool: t })}
          onToggleActive={handleToggleToolActive}
        />
      )}

      {/* Server Modal */}
      {showServerModal && (
        <ServerModal
          form={serverForm}
          setForm={setServerForm}
          isEditing={!!editingServer}
          saving={saving}
          onSave={handleSaveServer}
          onClose={() => setShowServerModal(false)}
        />
      )}

      {/* Tool Modal */}
      {showToolModal && (
        <ToolModal
          form={toolForm}
          setForm={setToolForm}
          servers={servers}
          isEditing={!!editingTool}
          saving={saving}
          onSave={handleSaveTool}
          onClose={() => setShowToolModal(false)}
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={deleteServerConfirm.isOpen}
        onClose={() => setDeleteServerConfirm({ isOpen: false, server: null })}
        onConfirm={handleDeleteServer}
        title="Удаление сервера"
        message={`Удалить сервер "${deleteServerConfirm.server?.name}"? Сервер должен быть без привязанных инструментов.`}
        confirmText="Удалить"
        danger
      />

      <ConfirmDialog
        isOpen={deleteToolConfirm.isOpen}
        onClose={() => setDeleteToolConfirm({ isOpen: false, tool: null })}
        onConfirm={handleDeleteTool}
        title="Удаление инструмента"
        message={`Удалить инструмент "${deleteToolConfirm.tool?.name}"?`}
        confirmText="Удалить"
        danger
      />
    </div>
  )
}

// ============== Servers Table ==============

function ServersTable({
  servers,
  onEdit,
  onDelete,
  onCheckHealth,
  onRegenerateKey,
  copiedField,
  onCopy,
}: {
  servers: ToolServer[]
  onEdit: (s: ToolServer) => void
  onDelete: (s: ToolServer) => void
  onCheckHealth: (s: ToolServer) => void
  onRegenerateKey: (s: ToolServer) => void
  copiedField: string | null
  onCopy: (text: string, field: string) => void
}) {
  if (servers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Server className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">Нет серверов</h3>
        <p className="text-gray-400">Добавьте сервер для размещения инструментов</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Сервер</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">URL</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">API Key</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {servers.map(server => (
            <tr key={server.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-[#5F6062]">{server.name}</div>
                {server.description && (
                  <div className="text-sm text-gray-500">{server.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {server.tools_count || 0} инструментов
                </div>
              </td>
              <td className="px-6 py-4">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{server.base_url}</code>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {server.api_key.substring(0, 15)}...
                  </code>
                  <button
                    onClick={() => onCopy(server.api_key, `key-${server.id}`)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {copiedField === `key-${server.id}` ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {server.is_healthy ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Доступен
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertCircle className="h-3 w-3" />
                      Недоступен
                    </span>
                  )}
                  {!server.is_active && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                      Отключён
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onCheckHealth(server)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Проверить доступность"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRegenerateKey(server)}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Перегенерировать ключ"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(server)}
                    className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(server)}
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
  )
}

// ============== Tools Table ==============

function ToolsTable({
  tools,
  servers,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  tools: Tool[]
  servers: ToolServer[]
  onEdit: (t: Tool) => void
  onDelete: (t: Tool) => void
  onToggleActive: (t: Tool) => void
}) {
  if (tools.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">Нет инструментов</h3>
        <p className="text-gray-400">Создайте первый инструмент</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Инструмент</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Сервер</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Endpoint</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Использований</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tools.map(tool => {
            const server = servers.find(s => s.id === tool.server_id)
            return (
              <tr
                key={tool.id}
                className={`${!tool.is_active ? 'bg-gray-50 opacity-60' : ''} hover:bg-gray-50 transition-colors`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${tool.color}20`, color: tool.color }}
                    >
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-[#5F6062]">{tool.name}</div>
                      <div className="text-sm text-gray-500">{tool.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {server ? (
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{server.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Не привязан</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {tool.endpoint ? (
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {tool.http_method} {tool.endpoint}
                    </code>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onToggleActive(tool)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      tool.is_active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tool.is_active ? 'Активен' : 'Отключён'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{tool.usage_count}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(tool)}
                      className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(tool)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============== Server Modal ==============

function ServerModal({
  form,
  setForm,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  form: {
    name: string
    description: string
    base_url: string
    health_check_endpoint: string
    timeout_seconds: number
  }
  setForm: (f: typeof form) => void
  isEditing: boolean
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-[#5F6062]">
            {isEditing ? 'Редактирование сервера' : 'Новый сервер'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full"
              placeholder="Сервер обработки документов"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full"
              rows={2}
              placeholder="Опциональное описание"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5F6062] mb-2">Base URL *</label>
            <input
              type="url"
              value={form.base_url}
              onChange={e => setForm({ ...form, base_url: e.target.value })}
              className="w-full"
              placeholder="https://tools.example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">Health Check</label>
              <input
                type="text"
                value={form.health_check_endpoint}
                onChange={e => setForm({ ...form, health_check_endpoint: e.target.value })}
                className="w-full"
                placeholder="/health"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">Таймаут (сек)</label>
              <input
                type="number"
                value={form.timeout_seconds}
                onChange={e => setForm({ ...form, timeout_seconds: parseInt(e.target.value) || 30 })}
                className="w-full"
                min={5}
                max={300}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium">
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={!form.name || !form.base_url || saving}
            className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============== Tool Modal ==============

function ToolModal({
  form,
  setForm,
  servers,
  isEditing,
  saving,
  onSave,
  onClose,
}: {
  form: {
    name: string
    slug: string
    description: string
    icon: string
    color: string
    server_id: string
    endpoint: string
    http_method: string
    response_type: string
    is_active: boolean
    is_public: boolean
    sort_order: number
  }
  setForm: (f: typeof form) => void
  servers: ToolServer[]
  isEditing: boolean
  saving: boolean
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-[#5F6062]">
            {isEditing ? 'Редактирование инструмента' : 'Новый инструмент'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-[#5F6062] flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Основные настройки
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full"
                  placeholder="PDF в Excel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                  })}
                  className="w-full"
                  placeholder="pdf-to-excel"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full"
                rows={2}
                placeholder="Конвертирует таблицы из PDF в Excel"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">Цвет</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Server Connection */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-[#5F6062] flex items-center gap-2">
              <Server className="h-4 w-4" />
              Подключение к серверу
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Сервер</label>
                <select
                  value={form.server_id}
                  onChange={e => setForm({ ...form, server_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Не выбран</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">HTTP метод</label>
                <select
                  value={form.http_method}
                  onChange={e => setForm({ ...form, http_method: e.target.value })}
                  className="w-full"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">Endpoint</label>
              <input
                type="text"
                value={form.endpoint}
                onChange={e => setForm({ ...form, endpoint: e.target.value })}
                className="w-full"
                placeholder="/api/v1/pdf-to-excel"
              />
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-[#5F6062]">Видимость</h4>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Активен</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={e => setForm({ ...form, is_public: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Публичный</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium">
            Отмена
          </button>
          <button
            onClick={onSave}
            disabled={!form.name || !form.slug || saving}
            className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}
