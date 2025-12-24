import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, User, Users, Building2, AppWindow, Bot, Sparkles, Wrench, PanelLeftClose, PanelLeft, Activity } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { ToastContainer } from './Toast'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const isAdminSection = location.pathname.startsWith('/admin')

  // Sidebar collapse state - persist in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Форматирование имени пользователя
  const getUserDisplayName = () => {
    if (user?.last_name && user?.first_name) {
      const middleInitial = user.middle_name ? ` ${user.middle_name.charAt(0)}.` : ''
      return `${user.last_name} ${user.first_name.charAt(0)}.${middleInitial}`
    }
    return user?.display_name || user?.email || 'Пользователь'
  }

  const mainNavItems = [
    { path: '/apps', icon: Building2, label: 'Приложения' },
    { path: '/', icon: Bot, label: 'SeverinGPT' },
    { path: '/services', icon: Sparkles, label: 'Промпты' },
    { path: '/tools', icon: Wrench, label: 'Инструменты' },
  ]

  const adminNavItems = [
    { path: '/admin', icon: Activity, label: 'Мониторинг', exact: true },
    { path: '/admin/users', icon: Users, label: 'Пользователи и группы' },
    { path: '/admin/applications', icon: AppWindow, label: 'Приложения и доступ' },
    { path: '/admin/ai', icon: Bot, label: 'AI и промпты' },
    { path: '/admin/tools', icon: Wrench, label: 'Инструменты' },
  ]

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="layout-fullscreen">
      {/* Sidebar */}
      <aside className={`sidebar flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'w-[70px]' : 'w-[240px]'}`}>
        {/* Logo - высота h-16 совпадает с топбаром */}
        <div className="h-16 px-4 border-b border-gray-200 flex items-center flex-shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="AI-HUB" className="h-9 w-9 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-[#E52713] text-lg leading-tight tracking-tight">AI-HUB</span>
                <span className="text-[#5F6062] text-[10px] leading-tight">Severin Development</span>
              </div>
            )}
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 min-h-0 py-4 overflow-y-auto">
          {!isCollapsed && (
            <div className="mb-2 px-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Главное
              </span>
            </div>
          )}
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${isCollapsed ? 'justify-center px-2' : ''} ${isActive(item.path, item.path === '/') && !isAdminSection ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Admin Navigation */}
          {user?.is_admin && (
            <>
              {!isCollapsed && (
                <div className="mt-6 mb-2 px-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Администрирование
                  </span>
                </div>
              )}
              {isCollapsed && <div className="my-4 mx-2 border-t border-gray-200" />}
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-item ${isCollapsed ? 'justify-center px-2' : ''} ${isActive(item.path, item.exact) ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex-shrink-0 w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-[#E52713] hover:bg-[#FEF2F1] border-t border-gray-200 transition-colors"
          title={isCollapsed ? 'Развернуть' : 'Свернуть'}
        >
          {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          {!isCollapsed && <span className="text-sm">Свернуть</span>}
        </button>

        {/* User Info in Sidebar */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-[#FEF2F1] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-[#E52713]" />
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-[#E52713] hover:bg-[#FEF2F1] rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#FEF2F1] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#E52713]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#5F6062] truncate">
                    {getUserDisplayName()}
                  </p>
                  {user?.is_admin && (
                    <span className="badge badge-brand text-xs">
                      Администратор
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#E52713] hover:bg-[#FEF2F1] py-2 px-3 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-bold text-[#5F6062]">
              {isAdminSection ? 'Панель администратора' :
               location.pathname === '/' ? 'SeverinGPT' :
               location.pathname === '/services' ? 'Промпты' :
               location.pathname === '/apps' ? 'Приложения' :
               location.pathname === '/tools' ? 'Инструменты' : 'Портал'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </header>

        {/* Page Content with Background Pattern */}
        <main className="flex-1 overflow-auto relative">
          {/* Gradient mesh background */}
          <div className="absolute inset-0 bg-[#FAFAFA]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-100/40 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-tr from-violet-100/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative z-10 p-8 min-h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>

            {/* Footer - виден только при прокрутке */}
            <footer className="mt-16 pt-8 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <span className="font-medium text-gray-500">AI-HUB</span>
                <span className="text-gray-300">v1.0</span>
                <span className="text-gray-200">|</span>
                <span>© Severin Development</span>
                <span className="text-gray-200">|</span>
                <span>Design by <span className="text-[#E52713]/70">N. Khromenok</span></span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}
