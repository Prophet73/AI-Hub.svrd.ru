import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import ServicesPage from './pages/ServicesPage'
import DashboardPage from './pages/DashboardPage'
import ToolsPage from './pages/ToolsPage'
import UsersAndGroupsAdmin from './pages/admin/UsersAndGroupsAdmin'
import ApplicationsAndAccessAdmin from './pages/admin/ApplicationsAndAccessAdmin'
import AIAndPromptsAdmin from './pages/admin/AIAndPromptsAdmin'
import ToolsAdmin from './pages/admin/ToolsAdmin'
import MonitoringAdmin from './pages/admin/MonitoringAdmin'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_admin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <Layout>
              <ServicesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/apps"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <Layout>
              <ToolsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <MonitoringAdmin />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <Layout>
              <UsersAndGroupsAdmin />
            </Layout>
          </AdminRoute>
        }
      />
      {/* Redirect old /admin/groups to /admin/users */}
      <Route path="/admin/groups" element={<Navigate to="/admin/users" replace />} />
      {/* Redirect old /admin/access to /admin/applications */}
      <Route path="/admin/access" element={<Navigate to="/admin/applications" replace />} />
      <Route
        path="/admin/applications"
        element={
          <AdminRoute>
            <Layout>
              <ApplicationsAndAccessAdmin />
            </Layout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ai"
        element={
          <AdminRoute>
            <Layout>
              <AIAndPromptsAdmin />
            </Layout>
          </AdminRoute>
        }
      />
      {/* Redirect old routes to new consolidated pages */}
      <Route path="/admin/prompts" element={<Navigate to="/admin/ai" replace />} />
      <Route path="/admin/ai-settings" element={<Navigate to="/admin/ai" replace />} />
      <Route path="/admin/usage-stats" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/audit-log" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/login-history" element={<Navigate to="/admin" replace />} />
      <Route
        path="/admin/tools"
        element={
          <AdminRoute>
            <Layout>
              <ToolsAdmin />
            </Layout>
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
