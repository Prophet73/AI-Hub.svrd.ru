import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Eye, EyeOff, Sparkles } from 'lucide-react'
import { api } from '../../api/client'

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

export default function PromptsAdmin() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [form, setForm] = useState<PromptForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      const response = await api.get('/api/prompts/admin/all')
      setPrompts(response.data)
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setLoading(false)
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
      await api.put(`/api/prompts/${prompt.id}`, {
        is_active: !prompt.is_active,
      })
      loadPrompts()
    } catch (error) {
      console.error('Failed to toggle prompt:', error)
    }
  }

  const handleDelete = async (prompt: Prompt, hard: boolean = false) => {
    const message = hard
      ? `УДАЛИТЬ НАВСЕГДА промпт "${prompt.name}"? Это действие необратимо!`
      : `Скрыть промпт "${prompt.name}"?`
    if (!confirm(message)) {
      return
    }
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
          <h1 className="text-2xl font-bold text-[#5F6062]">Библиотека промптов</h1>
          <p className="text-gray-500 mt-1">Управление готовыми шаблонами для AI-ассистента</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Новый промпт
        </button>
      </div>

      {/* Prompts List */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Промпт
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Порядок
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prompts.map((prompt) => (
                <tr
                  key={prompt.id}
                  className={`${!prompt.is_active ? 'bg-gray-50 opacity-60' : ''} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-[#5F6062]">{prompt.name}</div>
                      {prompt.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">{prompt.description}</div>
                      )}
                    </div>
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
                        prompt.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {prompt.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {prompt.is_active ? 'Активен' : 'Скрыт'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(prompt)}
                        className="p-2 text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt, false)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Скрыть"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prompt, true)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить навсегда"
                      >
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-[#5F6062]">
                {editingPrompt ? 'Редактирование промпта' : 'Новый промпт'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Название *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
                  placeholder="Название промпта"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
                  rows={2}
                  placeholder="Краткое описание для карточки"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Категория</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5F6062] mb-2">Порядок сортировки</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Иконка</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
                >
                  {ICONS.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5F6062] mb-2">Текст промпта *</label>
                <textarea
                  value={form.prompt_text}
                  onChange={(e) => setForm({ ...form, prompt_text: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1] font-mono text-sm"
                  rows={8}
                  placeholder="Введите текст промпта, который будет использоваться в чате..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Этот текст будет вставлен в чат при выборе сервиса
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.prompt_text || saving}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
              >
                {saving ? 'Сохранение...' : editingPrompt ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
