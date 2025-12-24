import { useEffect, useState } from 'react'
import { Bot, Save, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { api } from '../../api/client'

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

export default function AISettingsAdmin() {
  const [settings, setSettings] = useState<ChatSettings | null>(null)
  const [models, setModels] = useState<AvailableModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    model_name: '',
    system_prompt: '',
    daily_message_limit: 100,
    max_tokens: 8192,
    is_enabled: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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
      setMessage({ type: 'error', text: 'Не удалось загрузить настройки' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
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
      setSaving(false)
    }
  }

  const handleToggleEnabled = () => {
    setFormData((prev) => ({ ...prev, is_enabled: !prev.is_enabled }))
  }

  if (loading) {
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
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">Настройки AI</h1>
          <p className="text-gray-500 mt-1">Управление параметрами SeverinGPT</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Сохранить
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Settings cards */}
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
                <p className="text-sm text-gray-500">Включить или отключить AI-ассистента</p>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`transition-colors ${formData.is_enabled ? 'text-emerald-500' : 'text-gray-400'}`}
            >
              {formData.is_enabled ? (
                <ToggleRight className="w-10 h-10" />
              ) : (
                <ToggleLeft className="w-10 h-10" />
              )}
            </button>
          </div>
          <div
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              formData.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {formData.is_enabled ? 'Чат включён и доступен пользователям' : 'Чат отключён'}
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-[#5F6062] mb-4">Модель AI</h3>
          <div className="space-y-3">
            {models.map((model) => (
              <label
                key={model.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.model_name === model.id
                    ? 'border-[#E52713] bg-[#FEF2F1]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={formData.model_name === model.id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model_name: e.target.value }))}
                  className="mt-1 text-[#E52713] focus:ring-[#E52713]"
                />
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
              <label className="block text-sm font-medium text-[#5F6062] mb-2">
                Сообщений в день (на пользователя)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={formData.daily_message_limit}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    daily_message_limit: parseInt(e.target.value) || 100,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ограничение количества сообщений на одного пользователя в день
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5F6062] mb-2">
                Максимум токенов в ответе
              </label>
              <input
                type="number"
                min={100}
                max={32000}
                step={100}
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_tokens: parseInt(e.target.value) || 8192,
                  }))
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1]"
              />
              <p className="text-xs text-gray-400 mt-1">
                Ограничивает длину ответа AI (1 токен ~ 4 символа)
              </p>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-[#5F6062] mb-4">Системный промпт</h3>
          <textarea
            value={formData.system_prompt}
            onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
            rows={6}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1] font-mono text-sm"
            placeholder="Инструкции для AI-ассистента..."
          />
          <p className="text-xs text-gray-400 mt-2">
            Этот текст задаёт поведение AI-ассистента во всех чатах
          </p>
        </div>
      </div>

      {/* Info */}
      {settings?.updated_at && (
        <div className="text-sm text-gray-400 text-center">
          Последнее обновление:{' '}
          {new Date(settings.updated_at).toLocaleString('ru-RU', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </div>
      )}
    </div>
  )
}
