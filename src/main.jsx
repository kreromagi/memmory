import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 🔍 Проверьте структуру папок

Убедитесь, что у вас есть:
```
figma-design-system-extractor/
├── src/
│   ├── main.jsx          ← СОЗДАЙТЕ ЭТОТ ФАЙЛ
│   ├── App.jsx           ← Должен быть
│   ├── App.css           ← Должен быть
│   └── services/
│       ├── figmaService.js      ← Должен быть
│       └── supabaseService.js   ← Должен быть
├── index.html
├── package.json
├── vite.config.js
└── netlify.toml
