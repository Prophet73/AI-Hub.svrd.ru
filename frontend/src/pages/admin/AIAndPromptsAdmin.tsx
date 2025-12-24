import { useEffect, useState } from 'react'
import {
  Plus, Edit2, Trash2, X, Eye, EyeOff, Sparkles,
  Bot, Save, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react'
import { api } from '../../api/client'

// ============== Types ==============

interface Prompt {
  id: string
  name: string
  description: string | null
  category: string
  prompt_text: string
  icon: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

interface PromptForm {
  name: string
  description: string
  category: string
  prompt_text: string
  icon: string
  sort_order: number
}

interface ChatSettings {
  id: number
  model_name: string
  system_prompt: string
  daily_message_limit: number
  max_tokens: number
  is_enabled: boolean
  updated_at: string | null
}

interface AvailableModel {
  id: string
  name: string
  description: string
}

// ============== Constants ==============

const CATEGORIES = [
  { value: 'writing', label: 'Написание текста' },
  { value: 'analysis', label: 'Анализ данных' },
  { value: 'code', label: 'Программирование' },
  { value: 'translation', label: 'Перевод' },
  { value: 'summary', label: 'Резюмирование' },
  { value: 'other', label: 'Другое' },
]

const ICONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'FileText', label: 'Документ' },
  { value: 'BarChart3', label: 'График' },
  { value: 'Code2', label: 'Код' },
  { value: 'Languages', label: 'Языки' },
  { value: 'MessageSquare', label: 'Сообщение' },
  { value: 'Sparkles', label: 'Звёзды' },
]

const emptyForm: PromptForm = {
  name: '',
  description: '',
  category: 'other',
  prompt_text: '',
  icon: '',
  sort_order: 0,
}

type TabType = 'prompts' | 'settings'

export default function AIAndPromptsAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('prompts')

  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [promptsLoading, setPromptsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [form, setForm] = useState<PromptForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [models, setModels] = useState<AvailableModel[]>([])
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    model_name: '',
    system_prompt: '',
    daily_message_limit: 100,
    max_tokens: 8192,
    is_enabled: true,
  })

  useEffect(() => {
    loadPrompts()
    loadSettings()
  }, [])

  // ============== Prompts Functions ==============

  const loadPrompts = async () => {
    try {
      const response = await api.get('/api/prompts/admin/all')
      setPrompts(response.data)
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setPromptsLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingPrompt(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setForm({
      name: prompt.name,
      description: prompt.description || '',
      category: prompt.category,
      prompt_text: prompt.prompt_text,
      icon: prompt.icon || '',
      sort_order: prompt.sort_order,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (editingPrompt) {
        await api.put(`/api/prompts/${editingPrompt.id}`, {
          name: form.name,
          description: form.description || null,
          category: form.category,
          prompt_text: form.prompt_text,
          icon: form.icon || null,
          sort_order: form.sort_order,
        })
      } else {
        await api.post('/api/prompts/', {
          name: form.name,
          description: form.description || null,
          category: form.category,
          prompt_text: form.prompt_text,
          icon: form.icon || null,
          sort_order: form.sort_order,
        })
      }
      setShowModal(false)
      loadPrompts()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось сохранить промпт')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (prompt: Prompt) => {
    try {
      await api.put(`/api/prompts/${prompt.id}`, { is_active: !prompt.is_active })
      loadPrompts()
    } catch (error) {
      console.error('Failed to toggle prompt:', error)
    }
  }

  const handleDelete = async (prompt: Prompt, hard: boolean = false) => {
    const msg = hard
      ? `УДАЛИТЬ НАВСЕГДА промпт "${prompt.name}"? Это действие необратимо!`
      : `Скрыть промпт "${prompt.name}"?`
    if (!confirm(msg)) return
    try {
      await api.delete(`/api/prompts/${prompt.id}${hard ? '?hard=true' : ''}`)
      loadPrompts()
    } catch (error) {
      console.error('Failed to delete prompt:', error)
    }
  }

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category
  }

  // ============== Settings Functions ==============

  const loadSettings = async () => {
    try {
      const [settingsRes, modelsRes] = await Promise.all([
        api.get('/api/chat/admin/settings'),
        api.get('/api/chat/admin/models'),
      ])
      setSettings(settingsRes.data)
      setModels(modelsRes.data)
      setFormData({
        model_name: settingsRes.data.model_name,
        system_prompt: settingsRes.data.system_prompt,
        daily_message_limit: settingsRes.data.daily_message_limit,
        max_tokens: settingsRes.data.max_tokens,
        is_enabled: settingsRes.data.is_enabled,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setMessage(null)
    try {
      const response = await api.put('/api/chat/admin/settings', formData)
      setSettings(response.data)
      setMessage({ type: 'success', text: 'Настройки сохранены' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Не удалось сохранить настройки',
      })
    } finally {
      setSettingsSaving(false)
    }
  }

  // ============== Render ==============

  const isLoading = activeTab === 'prompts' ? promptsLoading : settingsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-[#E52713] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#E52713]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#5F6062]">AI и промпты</h1>
            <p className="text-gray-500 text-sm">Управление AI-ассистентом и библиотекой промптов</p>
          </div>
        </div>
        {activeTab === 'prompts' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Новый промпт
          </button>
        )}
        {activeTab === 'settings' && (
          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
          >
            {settingsSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Сохранить
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'prompts'
                ? 'border-[#E52713] text-[#E52713]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Промпты ({prompts.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-[#E52713] text-[#E52713]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Настройки AI
            </span>
          </button>
        </nav>
      </div>

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {prompts.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Промпты пока не добавлены</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Промпт</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Категория</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Порядок</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prompts.map((prompt) => (
                  <tr key={prompt.id} className={`${!prompt.is_active ? 'bg-gray-50 opacity-60' : ''} hover:bg-gray-50`}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#5F6062]">{prompt.name}</div>
                      {prompt.description && <div className="text-sm text-gray-500 line-clamp-1">{prompt.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {getCategoryLabel(prompt.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{prompt.sort_order}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(prompt)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          prompt.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {prompt.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {prompt.is_active ? 'Активен' : 'Скрыт'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(prompt)} className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg" title="Редактировать">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(prompt, false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Скрыть">
                          <EyeOff className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(prompt, true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {message && (
            <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FEF2F1] rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[#E52713]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#5F6062]">Статус чата</h3>
                    <p className="text-sm text-gray-500">Включить или отключить AI</p>
                  </div>
                </div>
                <button onClick={() => setFormData(prev => ({ ...prev, is_enabled: !prev.is_enabled }))} className={`transition-colors ${formData.is_enabled ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {formData.is_enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                </button>
              </div>
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${formData.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {formData.is_enabled ? 'Чат включён' : 'Чат отключён'}
              </div>
            </div>

            {/* Model Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#5F6062] mb-4">Модель AI</h3>
              <div className="space-y-3">
                {models.map((model) => (
                  <label key={model.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${formData.model_name === model.id ? 'border-[#E52713] bg-[#FEF2F1]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="model" value={model.id} checked={formData.model_name === model.id} onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))} className="mt-1 text-[#E52713]" />
                    <div>
                      <div className="font-medium text-[#5F6062]">{model.name}</div>
                      <div className="text-sm text-gray-500">{model.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#5F6062] mb-4">Лимиты</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Сообщений в день</label>
                  <input type="number" min={1} max={10000} value={formData.daily_message_limit} onChange={(e) => setFormData(prev => ({ ...prev, daily_message_limit: parseInt(e.target.value) || 100 }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Макс. токенов</label>
                  <input type="number" min={100} max={32000} step={100} value={formData.max_tokens} onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 8192 }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713]" />
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-[#5F6062] mb-4">Системный промпт</h3>
              <textarea value={formData.system_prompt} onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))} rows={6} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] font-mono text-sm" placeholder="Инструкции для AI..." />
            </div>
          </div>

          {settings?.updated_at && (
            <div className="text-sm text-gray-400 text-center">
              Обновлено: {new Date(settings.updated_at).toLocaleString('ru-RU')}
            </div>
          )}
        </div>
      )}

      {/* Prompt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">{editingPrompt ? 'Редактирование' : 'Новый промпт'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Категория</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg">
                    {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Порядок</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Иконка</label>
                <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg">
                  {ICONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Текст промпта *</label>
                <textarea value={form.prompt_text} onChange={(e) => setForm({ ...form, prompt_text: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-mono text-sm" rows={8} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium">Отмена</button>
              <button onClick={handleSubmit} disabled={!form.name || !form.prompt_text || saving} className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 font-medium">
                {saving ? 'Сохранение...' : editingPrompt ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
