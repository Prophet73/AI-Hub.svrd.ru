import { useEffect, useState } from 'react'
import { X, Globe, Building2, Plus } from 'lucide-react'
import { api } from '../../api/client'

interface Application {
  id: string
  name: string
  slug: string
  is_active: boolean
  allowed_departments: string[]
}

export default function AccessAdmin() {
  const [applications, setApplications] = useState<Application[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [appsRes, depsRes] = await Promise.all([
        api.get('/api/admin/applications'),
        api.get('/api/admin/departments')
      ])
      setApplications(appsRes.data)
      setDepartments(depsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAccessModal = (app: Application) => {
    setSelectedApp({ ...app })
    setShowModal(true)
  }

  const toggleDepartment = (dept: string) => {
    if (!selectedApp) return

    const current = selectedApp.allowed_departments || []
    const updated = current.includes(dept)
      ? current.filter(d => d !== dept)
      : [...current, dept]

    setSelectedApp({ ...selectedApp, allowed_departments: updated })
  }

  const addCustomDepartment = () => {
    if (!selectedApp || !newDepartment.trim()) return

    const current = selectedApp.allowed_departments || []
    if (!current.includes(newDepartment.trim())) {
      setSelectedApp({
        ...selectedApp,
        allowed_departments: [...current, newDepartment.trim()]
      })
    }
    setNewDepartment('')
  }

  const setAllAccess = () => {
    if (!selectedApp) return
    setSelectedApp({ ...selectedApp, allowed_departments: [] })
  }

  const saveAccess = async () => {
    if (!selectedApp) return

    try {
      await api.patch(`/api/admin/applications/${selectedApp.id}/departments`,
        selectedApp.allowed_departments
      )
      await loadData()
      setShowModal(false)
      setSelectedApp(null)
    } catch (error) {
      console.error('Failed to save access:', error)
    }
  }

  const getAccessLabel = (app: Application) => {
    const deps = app.allowed_departments || []
    if (deps.length === 0) return 'Все сотрудники'
    if (deps.length === 1) return deps[0]
    return `${deps.length} департамента`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#5F6062]">Управление доступом</h1>
        <p className="text-gray-500 mt-1">Настройка доступа к приложениям по департаментам</p>
      </div>

      {/* Info */}
      <div className="bg-[#FEF2F1] border border-red-200 rounded-xl p-4">
        <p className="text-[#E52713] text-sm">
          <strong>Пустой список</strong> = приложение доступно всем сотрудникам.{' '}
          <strong>Выбранные департаменты</strong> = приложение видят только сотрудники этих департаментов.
        </p>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 spinner"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Приложение</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Доступ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Департаменты</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-[#5F6062]">{app.name}</p>
                      <p className="text-sm text-gray-500">{app.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium w-fit ${
                      (app.allowed_departments || []).length === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {(app.allowed_departments || []).length === 0 ? (
                        <>
                          <Globe className="h-4 w-4" />
                          Все
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4" />
                          Ограничен
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getAccessLabel(app)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openAccessModal(app)}
                      className="text-[#E52713] hover:text-[#C91F0F] text-sm font-medium"
                    >
                      Настроить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Access Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#5F6062]">{selectedApp.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Настройка доступа по департаментам</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedApp(null)
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <button
                onClick={setAllAccess}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (selectedApp.allowed_departments || []).length === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                Доступно всем
              </button>
            </div>

            {/* Department Selection */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Департаменты с доступом:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(selectedApp.allowed_departments || []).map((dept) => (
                  <span
                    key={dept}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#E52713] text-white rounded-full text-sm"
                  >
                    {dept}
                    <button onClick={() => toggleDepartment(dept)} className="hover:bg-white/20 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {(selectedApp.allowed_departments || []).length === 0 && (
                  <span className="text-gray-400 text-sm">Нет ограничений - доступно всем</span>
                )}
              </div>
            </div>

            {/* Available Departments */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Доступные департаменты:</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-auto">
                {departments
                  .filter(d => !(selectedApp.allowed_departments || []).includes(d))
                  .map((dept) => (
                    <button
                      key={dept}
                      onClick={() => toggleDepartment(dept)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full text-sm transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {dept}
                    </button>
                  ))}
              </div>
            </div>

            {/* Add Custom Department */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Добавить департамент вручную:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Название департамента"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#E52713] focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && addCustomDepartment()}
                />
                <button
                  onClick={addCustomDepartment}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedApp(null)
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={saveAccess}
                className="px-4 py-2.5 bg-[#E52713] text-white rounded-xl hover:bg-[#C91F0F] transition-colors font-medium"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
