import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import AppCard from '../components/AppCard'

interface Application {
  id: string
  name: string
  slug: string
  description: string | null
  base_url: string | null
  icon_url: string | null
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await api.get<Application[]>('/api/applications')
      return response.data
    },
  })

  // Фильтрация приложений по поиску
  const filteredApps = applications?.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[#E52713] font-medium mb-2">
            Не удалось загрузить приложения
          </p>
          <p className="text-gray-500 text-sm">
            Попробуйте обновить страницу
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Заголовок и поиск */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#5F6062]">
            Ваши приложения
          </h1>
          <p className="text-gray-500 mt-1">
            {filteredApps?.length || 0} {getAppCountText(filteredApps?.length || 0)} доступно
          </p>
        </div>

        {/* Поиск */}
        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск приложений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem' }}
            className="w-full pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#E52713] focus:ring-2 focus:ring-[#FEF2F1] transition-all"
          />
        </div>
      </div>

      {/* Сетка приложений */}
      {filteredApps && filteredApps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <AppCard key={app.id} application={app} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
          {searchQuery ? (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Ничего не найдено</p>
              <p className="text-gray-400 text-sm mt-1">
                Попробуйте изменить поисковый запрос
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#FEF2F1] rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <p className="text-gray-500 font-medium">Приложения не найдены</p>
              <p className="text-gray-400 text-sm mt-1">
                Обратитесь к администратору для получения доступа
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Склонение слова "приложение"
function getAppCountText(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'приложений'
  }

  if (lastDigit === 1) {
    return 'приложение'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'приложения'
  }

  return 'приложений'
}
