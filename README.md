# Каталог одягу

Веб-додаток (React + Vite + Express + SQLite/sql.js) для перегляду каталогу, фільтрації та обраного.

## Локальний запуск

```bash
npm install
npm run dev
```

- Сайт: http://localhost:5173  
- API: http://localhost:3001  

Демо-акаунти: `admin` / `admin123`, `user` / `user123`.

### Продакшен локально

```bash
npm install
npm run build
npm start
```

Відкрийте http://localhost:3001 — сервер віддає зібраний фронтенд і API.

## Деплой на Render

1. Завантажте репозиторій на GitHub.
2. У [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** (або **Web Service**).
3. Підключіть репозиторій; Render підхопить `render.yaml` або налаштуйте вручну:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Змінні середовища:
   - `NODE_ENV` = `production`
   - `AUTH_SECRET` — згенеруйте довгий випадковий рядок (Render може зробити це автоматично через Blueprint).
5. Після деплою відкрийте URL сервісу (наприклад `https://clothing-catalog.onrender.com`).

### Збереження бази даних на Render

На безкоштовному плані диск **епізерний** — після redeploy БД створюється заново (міграції + демо-користувачі). Щоб зберігати дані:

1. Додайте **Persistent Disk** до Web Service (mount path, наприклад `/var/data`).
2. Додайте змінну `DATA_DIR` = `/var/data`.

## Структура

- `src/` — React-клієнт
- `server/` — Express API, міграції, SQLite
- `public/images/products/` — зображення товарів (`1.svg`, `1.jpg`, …)
- `data/catalog.db` — локальна база (не в git)
