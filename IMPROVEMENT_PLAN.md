# Hub: План улучшений перед деплоем

## Обзор

Комплексное улучшение Hub приложения по 5 направлениям:
1. **Статистика и аналитика** - история входов, использование приложений, audit log
2. **Безопасность** - rate limiting, PKCE, валидация токенов
3. **Frontend UX** - пагинация, уведомления, подтверждения действий
4. **Стабильность** - улучшение обработки ошибок, SSE parsing
5. **Исправления UI** - поисковые строки (debounce), страница /services

---

## Фаза 1: База данных - Модели для трекинга активности

### 1.1 Новая модель AuditLog
**Файл:** `backend/src/models/audit_log.py` (NEW)

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))  # кто выполнил действие
    action = Column(String(50))        # "user.update", "group.create", "access.grant"
    entity_type = Column(String(50))   # "user", "group", "application"
    entity_id = Column(UUID)           # ID затронутой сущности
    old_values = Column(JSON)          # состояние до
    new_values = Column(JSON)          # состояние после
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime)
```

### 1.2 Новая модель LoginHistory
**Файл:** `backend/src/models/login_history.py` (NEW)

```python
class LoginHistory(Base):
    __tablename__ = "login_history"

    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    login_type = Column(String(20))    # "sso", "dev", "oauth_authorize"
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    success = Column(Boolean)
    failure_reason = Column(String(255))
    created_at = Column(DateTime)
```

### 1.3 Миграции
**Файлы:**
- `backend/alembic/versions/xxx_add_audit_log.py`
- `backend/alembic/versions/xxx_add_login_history.py`

**Изменить:** `backend/src/models/__init__.py` - добавить импорты новых моделей

---

## Фаза 2: Безопасность

### 2.1 Rate Limiting
**Файл:** `backend/src/core/rate_limit.py` (NEW)

Лимиты:
| Эндпоинт | Лимит |
|----------|-------|
| `/auth/*` | 10 req/min (защита от brute force) |
| `/oauth/token` | 20 req/min |
| `/api/admin/*` | 100 req/min |
| Общий | 200 req/min |

**Изменить:** `backend/src/main.py` - добавить middleware

### 2.2 PKCE поддержка для OAuth2
**Изменить:** `backend/src/api/oauth.py`

`/oauth/authorize`:
- Принимать `code_challenge` и `code_challenge_method`
- Сохранять в OAuthCode

`/oauth/token`:
- Принимать `code_verifier`
- Валидировать против сохранённого code_challenge (SHA256)

**Изменить:** `backend/src/models/oauth_token.py`
- Добавить `code_challenge`, `code_challenge_method` в OAuthCode

**Миграция:** `backend/alembic/versions/xxx_add_pkce_support.py`

### 2.3 Криптографическая верификация state
**Изменить:** `backend/src/services/sso_service.py`

- `generate_state()` - HMAC-SHA256 подпись с timestamp
- `verify_state()` - проверка подписи и срока (10 мин)

**Изменить:** `backend/src/api/auth.py` - добавить верификацию в callback

### 2.4 Максимальное время жизни refresh token
**Изменить:** `backend/src/core/config.py`
- `MAX_REFRESH_TOKEN_DAYS: int = 30`

**Изменить:** `backend/src/services/oauth_service.py`
- Отклонять refresh если токен старше 30 дней

**Изменить:** `backend/src/models/oauth_token.py`
- Добавить `refresh_token_expires_at` в OAuthToken

### 2.5 Audit Service
**Файл:** `backend/src/services/audit_service.py` (NEW)

```python
class AuditService:
    @staticmethod
    async def log_action(db, user_id, action, entity_type, entity_id,
                         old_values, new_values, request) -> AuditLog
```

**Изменить:** `backend/src/api/admin.py`

Логировать:
- `update_user`, `bulk_user_action` → action="user.update"
- `create_group`, `update_group`, `delete_group` → action="group.*"
- `grant_access`, `revoke_access` → action="access.*"
- Изменения приложений → action="application.*"

---

## Фаза 3: API Статистики и Аналитики

### 3.1 Расширенный /api/admin/stats
**Изменить:** `backend/src/api/admin.py`

Добавить в ответ:
```python
{
    # существующее...
    "logins": {
        "today": int,
        "last_7_days": int,
        "last_30_days": int
    },
    "oauth_usage": {
        "tokens_issued_today": int,
        "tokens_issued_7_days": int,
        "by_application": [{"app_name": str, "count": int}]
    }
}
```

### 3.2 Новые эндпоинты
**Добавить в:** `backend/src/api/admin.py`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/login-history` | История входов с пагинацией и фильтрами |
| GET | `/api/admin/audit-log` | Audit log с пагинацией и фильтрами |
| GET | `/api/admin/app-usage/{app_id}` | Статистика OAuth по приложению |
| GET | `/api/admin/user-activity/{user_id}` | Активность пользователя |

### 3.3 Новые схемы
**Изменить:** `backend/src/schemas/admin.py`

Добавить:
- `LoginHistoryResponse`
- `AuditLogResponse`
- `AppUsageStatsResponse`
- `PaginatedResponse[T]`

---

## Фаза 4: Frontend улучшения

### 4.1 Компонент пагинации
**Файл:** `frontend/src/components/Pagination.tsx` (NEW)

- Номера страниц с ellipsis
- Выбор количества на странице
- Клавиатурная навигация

### 4.2 Toast уведомления
**Файлы:**
- `frontend/src/components/Toast.tsx` (NEW)
- `frontend/src/store/toast.ts` (NEW)

- Success, error, warning, info варианты
- Auto-dismiss + ручное закрытие
- Стек для нескольких уведомлений

### 4.3 Диалог подтверждения
**Файл:** `frontend/src/components/ConfirmDialog.tsx` (NEW)

- Danger mode для деструктивных действий
- Поддержка Escape для отмены

### 4.4 Debounce хук
**Файл:** `frontend/src/hooks/useDebounce.ts` (NEW)

- 300ms задержка по умолчанию для поиска

### 4.5 Обновление Admin страниц

**UsersAdmin.tsx:**
- Пагинация (убрать hardcoded limit=500)
- Debounce для поиска
- Confirmation dialogs для bulk actions
- Toast уведомления

**GroupsAdmin.tsx:**
- То же самое

**ApplicationsAdmin.tsx:**
- То же самое + валидация redirect_uris

### 4.6 Расширение AdminDashboard
**Изменить:** `frontend/src/pages/admin/AdminDashboard.tsx`

- График входов за 7 дней
- Топ приложений по OAuth
- Превью последних audit записей

### 4.7 Новые Admin страницы

**Файлы:**
- `frontend/src/pages/admin/AuditLogAdmin.tsx` (NEW)
- `frontend/src/pages/admin/LoginHistoryAdmin.tsx` (NEW)

**Изменить:** `frontend/src/App.tsx` - добавить роуты

### 4.8 Исправление SSE в чате
**Изменить:** `frontend/src/pages/ChatPage.tsx`

- Буферизация неполных chunks
- Корректный парсинг multi-line data
- Graceful handling разрывов соединения
- Retry логика

### 4.9 Accessibility
**Изменить:** несколько компонентов

- aria-labels на интерактивных элементах
- Клавиатурная навигация (Tab, Enter, Escape)
- Focus indicators
- Screen reader announcements

---

## Порядок реализации

```
Фаза 1 (модели)
    ↓
Фаза 2 (безопасность) - можно параллельно:
    ├── 2.1 Rate Limiting
    ├── 2.2 PKCE
    ├── 2.3 State verification
    ├── 2.4 Token lifetime
    └── 2.5 Audit service
    ↓
Фаза 3 (API статистики) - зависит от Фазы 1
    ↓
Фаза 4 (Frontend) - можно параллельно:
    ├── 4.1-4.4 Компоненты
    ├── 4.5-4.7 Admin страницы (зависят от 4.1-4.4)
    ├── 4.8 Chat fixes
    └── 4.9 Accessibility
```

---

## Ключевые файлы для изменения

### Backend - Новые файлы
| Файл | Описание |
|------|----------|
| `backend/src/models/audit_log.py` | Модель audit log |
| `backend/src/models/login_history.py` | Модель истории входов |
| `backend/src/core/rate_limit.py` | Rate limiting middleware |
| `backend/src/services/audit_service.py` | Сервис аудита |

### Backend - Изменения
| Файл | Изменения |
|------|-----------|
| `backend/src/models/__init__.py` | Импорты новых моделей |
| `backend/src/core/config.py` | Новые настройки безопасности |
| `backend/src/services/sso_service.py` | State verification, login tracking |
| `backend/src/services/oauth_service.py` | PKCE, token lifetime |
| `backend/src/api/admin.py` | Расширенная статистика, новые эндпоинты, audit logging |
| `backend/src/api/oauth.py` | PKCE support |
| `backend/src/api/auth.py` | State verification, login history |
| `backend/src/schemas/admin.py` | Новые схемы |
| `backend/src/main.py` | Rate limit middleware |

### Frontend - Новые файлы
| Файл | Описание |
|------|----------|
| `frontend/src/components/Pagination.tsx` | Компонент пагинации |
| `frontend/src/components/Toast.tsx` | Toast уведомления |
| `frontend/src/components/ConfirmDialog.tsx` | Диалог подтверждения |
| `frontend/src/hooks/useDebounce.ts` | Хук debounce |
| `frontend/src/store/toast.ts` | Store для toast |
| `frontend/src/pages/admin/AuditLogAdmin.tsx` | Страница audit log |
| `frontend/src/pages/admin/LoginHistoryAdmin.tsx` | Страница истории входов |

### Frontend - Изменения
| Файл | Изменения |
|------|-----------|
| `frontend/src/pages/admin/UsersAdmin.tsx` | Pagination, debounce, toasts, confirm |
| `frontend/src/pages/admin/GroupsAdmin.tsx` | Pagination, debounce, toasts, confirm |
| `frontend/src/pages/admin/ApplicationsAdmin.tsx` | Pagination, validation |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Charts, analytics preview |
| `frontend/src/pages/ChatPage.tsx` | SSE fixes |
| `frontend/src/App.tsx` | Новые роуты |

### Миграции
| Файл | Описание |
|------|----------|
| `backend/alembic/versions/xxx_add_audit_log.py` | Таблица audit_logs |
| `backend/alembic/versions/xxx_add_login_history.py` | Таблица login_history |
| `backend/alembic/versions/xxx_add_pkce_support.py` | PKCE поля в oauth_codes |
| `backend/alembic/versions/xxx_add_token_lifetime.py` | refresh_token_expires_at |

---

## Конфигурация

**Добавить в** `backend/src/core/config.py`:

```python
# Rate Limiting
RATE_LIMIT_AUTH: int = 10        # /auth/* per minute
RATE_LIMIT_TOKEN: int = 20       # /oauth/token per minute
RATE_LIMIT_ADMIN: int = 100      # /api/admin/* per minute
RATE_LIMIT_GENERAL: int = 200    # general per minute

# Security
MAX_REFRESH_TOKEN_DAYS: int = 30
STATE_TOKEN_EXPIRY_MINUTES: int = 10
```

---

## Итого

| Категория | Новых файлов | Изменений | Миграций |
|-----------|--------------|-----------|----------|
| Backend | 4 | 9 | 4 |
| Frontend | 7 | 6 | - |
| **Всего** | **11** | **15** | **4** |
