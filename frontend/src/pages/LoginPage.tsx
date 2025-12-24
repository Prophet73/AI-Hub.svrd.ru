import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { SplineScene } from '../components/SplineScene'
import { Spotlight } from '../components/Spotlight'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuthStore()

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/')
    }
  }, [user, isLoading, navigate])

  const handleSSOLogin = () => {
    window.location.href = '/auth/sso/login?redirect_to=/'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-10 h-10 spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-black overflow-hidden">
      {/* Spotlight эффекты - pointer-events-none */}
      <div className="pointer-events-none">
        <Spotlight
          className="-top-40 -left-10 md:-left-32 md:-top-20"
          fill="white"
        />
        <Spotlight
          className="top-28 left-80 h-[80vh] w-[50vw]"
          fill="#E52713"
        />
      </div>

      {/* Декоративные световые пятна */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E52713]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      {/* 3D Robot - слева */}
      <div className="absolute left-0 top-0 bottom-0 w-[50%] hidden lg:block z-0">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full"
        />
        {/* Градиентный переход для плавного слияния с правой частью */}
        <div className="absolute inset-y-0 right-0 w-48 bg-gradient-to-r from-transparent via-black/50 to-black pointer-events-none" />
      </div>

      {/* Вертикальный blur-разделитель по центру */}
      <div className="absolute left-[48%] top-0 bottom-0 w-[8%] hidden lg:block z-[1] pointer-events-none">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-black/80 to-transparent backdrop-blur-sm" />
      </div>

      {/* Логотип в углу */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-4 pointer-events-none">
        <img src="/logo-icon-white.png" alt="AI-HUB" className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AI-HUB</h1>
          <p className="text-white/50 text-xs">by Severin Development</p>
        </div>
      </div>

      {/* Форма входа - по центру */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-8 pointer-events-none">
        <div className="w-full max-w-sm pointer-events-auto">
          <p className="text-white/50 text-center mb-4">
            Авторизация с корпоративной учётной записью
          </p>
          <button
            onClick={handleSSOLogin}
            className="w-full flex items-center justify-center gap-3 bg-[#E52713] hover:bg-[#C91F0F] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 hover:scale-[1.02]"
          >
            <LogIn className="w-5 h-5" />
            Войти
          </button>

          {/* Dev login - только для разработки */}
          {(import.meta.env.DEV || window.location.hostname === 'localhost') && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => window.location.href = '/auth/dev-login?role=holder'}
                className="bg-white/5 hover:bg-white/10 text-amber-400 font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-white/10"
              >
                H
              </button>
              <button
                onClick={() => window.location.href = '/auth/dev-login?role=admin'}
                className="bg-white/5 hover:bg-white/10 text-red-400 font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-white/10"
              >
                A
              </button>
              <button
                onClick={() => window.location.href = '/auth/dev-login?role=user'}
                className="bg-white/5 hover:bg-white/10 text-white/70 font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-white/10"
              >
                U
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Сетка для эффекта глубины */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
    </div>
  )
}
