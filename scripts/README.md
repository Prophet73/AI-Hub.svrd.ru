# Hub Admin Scripts

Набор утилит для администрирования Hub.

## Quick Reference

| Script | Description | Sudo |
|--------|-------------|------|
| `backup-db.sh` | Бэкап PostgreSQL с ротацией | No |
| `restore-db.sh` | Восстановление из бэкапа | No |
| `export-to-excel.py` | Экспорт данных в Excel | No |
| `cleanup-tokens.sh` | Очистка истёкших токенов | No |
| `db-stats.sh` | Статистика базы данных | No |
| `health-check.sh` | Проверка здоровья сервисов | No |

---

## backup-db.sh

Создаёт сжатый бэкап PostgreSQL с автоматической ротацией старых копий.

```bash
# Базовый бэкап (хранит последние 7)
bash scripts/backup-db.sh

# Хранить последние 14 бэкапов
bash scripts/backup-db.sh --keep 14

# Указать директорию для бэкапов
bash scripts/backup-db.sh --dir /backups/hub
```

### Cron (ежедневно в 2:00)
```bash
0 2 * * * /opt/hub/scripts/backup-db.sh >> /var/log/hub-backup.log 2>&1
```

### Выходные файлы
```
backups/
├── hub_backup_20240115_020000.sql.gz
├── hub_backup_20240116_020000.sql.gz
└── hub_backup_20240117_020000.sql.gz
```

---

## restore-db.sh

Восстанавливает базу данных из бэкапа.

```bash
# Список доступных бэкапов
bash scripts/restore-db.sh --list

# Восстановить из последнего бэкапа
bash scripts/restore-db.sh --latest

# Восстановить из конкретного файла
bash scripts/restore-db.sh backups/hub_backup_20240115_020000.sql.gz
```

**ВНИМАНИЕ:** Это полностью перезаписывает текущую базу!

---

## export-to-excel.py

Экспортирует данные из базы в Excel файл.

### Требования
```bash
pip install openpyxl psycopg2-binary python-dotenv
```

### Использование
```bash
# Экспорт всех таблиц
python scripts/export-to-excel.py

# Экспорт только пользователей
python scripts/export-to-excel.py --tables users

# Экспорт в конкретный файл
python scripts/export-to-excel.py --output report.xlsx

# Несколько таблиц
python scripts/export-to-excel.py --tables users applications tokens
```

### Доступные таблицы
- `users` - Пользователи (email, ФИО, департамент, роли)
- `applications` - Приложения (name, client_id, URLs)
- `tokens` - OAuth токены (user, app, expiry)
- `codes` - Authorization codes (временные)

### Подключение к БД

Скрипт ищет настройки в следующем порядке:
1. Переменная `DATABASE_URL`
2. Файлы `.env` или `.env.prod` в текущей директории
3. Дефолтные значения для Docker (localhost:5432)

---

## cleanup-tokens.sh

Удаляет истёкшие OAuth коды и токены для освобождения места.

```bash
# Показать что будет удалено (без удаления)
bash scripts/cleanup-tokens.sh --dry-run

# Удалить с подтверждением
bash scripts/cleanup-tokens.sh

# Удалить без подтверждения (для cron)
bash scripts/cleanup-tokens.sh --force
```

### Что удаляется
- Истёкшие authorization codes
- Использованные codes старше 1 дня
- Истёкшие access tokens
- Отозванные tokens старше 7 дней

### Cron (ежедневно в 3:00)
```bash
0 3 * * * /opt/hub/scripts/cleanup-tokens.sh --force >> /var/log/hub-cleanup.log 2>&1
```

---

## db-stats.sh

Показывает статистику базы данных.

```bash
# Красивый вывод
bash scripts/db-stats.sh

# JSON формат (для мониторинга)
bash scripts/db-stats.sh --json
```

### Пример вывода
```
=== Hub Database Statistics ===
Generated: Mon Jan 15 12:00:00 2024

USERS
  Total:           150
  Active:          148
  Admins:          3
  Logged in today: 45
  Logged in week:  120

APPLICATIONS
  Total:           5
  Active:          4

OAUTH TOKENS
  Total:           1200
  Active:          890
  Expired:         280
  Revoked:         30

DATABASE
  Size:            45 MB
  Connections:     5
```

---

## health-check.sh

Проверяет работоспособность всех сервисов Hub.

```bash
# Полная проверка
bash scripts/health-check.sh

# Только exit code (для мониторинга)
bash scripts/health-check.sh --quiet

# JSON формат
bash scripts/health-check.sh --json

# Проверить внешние endpoints
bash scripts/health-check.sh --domain ai-hub.svrd.ru
```

### Exit codes
- `0` - Все сервисы работают
- `1` - Есть проблемы

### Что проверяется
- Docker daemon
- PostgreSQL container running
- Backend container running
- Frontend container running
- PostgreSQL ready (pg_isready)
- Backend API responding
- Database connection
- HTTPS endpoint (если указан domain)

### Пример использования в мониторинге
```bash
# Простая проверка
if bash scripts/health-check.sh --quiet; then
    echo "Hub is healthy"
else
    echo "Hub has problems!"
    bash scripts/health-check.sh  # Показать детали
fi
```

---

## Полезные cron задачи

```bash
# Редактировать crontab
crontab -e

# Добавить задачи:

# Бэкап каждый день в 2:00
0 2 * * * /opt/hub/scripts/backup-db.sh >> /var/log/hub-backup.log 2>&1

# Очистка токенов в 3:00
0 3 * * * /opt/hub/scripts/cleanup-tokens.sh --force >> /var/log/hub-cleanup.log 2>&1

# Health check каждые 5 минут
*/5 * * * * /opt/hub/scripts/health-check.sh --quiet || echo "Hub unhealthy!" | mail -s "Hub Alert" admin@example.com

# Еженедельный экспорт в Excel (воскресенье в 6:00)
0 6 * * 0 cd /opt/hub && python3 scripts/export-to-excel.py --output /backups/hub_weekly_$(date +\%Y\%m\%d).xlsx
```

---

## Требования

- Docker и Docker Compose
- Bash 4.0+
- Python 3.8+ (для export-to-excel.py)
- Контейнеры Hub должны быть запущены

## Установка Python зависимостей

```bash
pip install openpyxl psycopg2-binary python-dotenv
```

Или создайте requirements-scripts.txt:
```
openpyxl>=3.1.0
psycopg2-binary>=2.9.0
python-dotenv>=1.0.0
```

```bash
pip install -r scripts/requirements-scripts.txt
```
