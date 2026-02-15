# 🎨 Figma Design System Extractor

Приложение для извлечения данных из дизайн-систем Figma.

## 🚀 Быстрый старт

### 1. Получите Figma API токен
1. Figma → Settings → Personal Access Tokens
2. Create new token → скопируйте

### 2. Найдите File ID
В URL вашего файла: `figma.com/file/[FILE_ID]/...`

### 3. Загрузите на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### 4. Деплой на Netlify
1. netlify.com → Add new site
2. Import from GitHub
3. Deploy!

## ✨ Что извлекается

- 🎨 Все цвета
- 📝 Типографика (шрифты, размеры, начертания)
- 📏 Отступы и spacing
- 🔘 Скругления
- 🌑 Тени
- 🧩 Компоненты

## 💾 Форматы сохранения

- **JSON** — для программ и API
- **Supabase** (опционально) — для поиска и аналитики

## ⚠️ Важно

- Figma API: максимум 9 запросов/минуту
- Автоматические паузы 7 секунд между запросами
- Работает со всеми размерами дизайн-систем

## 📚 Документация

Полная документация в архиве проекта.
