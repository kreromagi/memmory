# 🏗️ Архитектура системы

## Общая схема

```mermaid
graph TB
    subgraph "Ваш компьютер"
        A[👤 Дизайнер]
    end
    
    subgraph "Figma"
        B[📐 Дизайн-система]
        C[🔑 Figma API]
    end
    
    subgraph "Netlify"
        D[🌐 Web приложение]
        E[⚛️ React интерфейс]
        F[🔧 Figma Service]
        G[💾 Supabase Service]
    end
    
    subgraph "Supabase"
        H[(🗄️ PostgreSQL)]
        I[📊 design_systems]
        J[📄 design_system_pages]
    end
    
    subgraph "AI/Нейросеть"
        K[🤖 Ваша нейросеть]
        L[💬 Чат-бот]
        M[📚 RAG система]
    end
    
    A -->|1. Вводит ключи| D
    D -->|2. Отправляет запрос| C
    C -->|3. Возвращает данные| F
    F -->|4. Анализирует| E
    E -->|5. Отображает| D
    G -->|6. Сохраняет| H
    H -->|7. Хранит| I
    H -->|7. Хранит| J
    I -->|8. Читает данные| K
    J -->|8. Читает данные| K
    K -->|9. Использует| L
    K -->|9. Использует| M
    M -->|10. Отвечает пользователю| A
```

## Поток данных

```mermaid
sequenceDiagram
    participant D as Дизайнер
    participant W as Web App
    participant F as Figma API
    participant S as Supabase
    participant AI as Нейросеть

    D->>W: 1. Нажимает "Синхронизировать"
    W->>F: 2. GET /files/{fileKey}
    F-->>W: 3. Структура файла
    
    loop Для каждой страницы (с задержкой 7 сек)
        W->>F: 4. GET /files/{fileKey}/nodes?ids={pageId}
        F-->>W: 5. Данные страницы
        W->>W: 6. Анализ и извлечение токенов
    end
    
    W-->>D: 7. Показать предпросмотр
    D->>W: 8. Нажимает "Сохранить в Supabase"
    W->>S: 9. INSERT/UPDATE данные
    S-->>W: 10. Подтверждение
    W-->>D: 11. Успех!
    
    Note over S,AI: Позже...
    AI->>S: 12. SELECT * FROM design_systems
    S-->>AI: 13. Данные дизайн-системы
    AI->>AI: 14. Генерация ответа
    AI-->>D: 15. Ответ на вопрос
```

## Структура данных

```mermaid
erDiagram
    DESIGN_SYSTEMS ||--o{ DESIGN_SYSTEM_PAGES : contains
    
    DESIGN_SYSTEMS {
        uuid id PK
        text figma_file_key UK
        text file_name
        timestamp last_modified
        timestamp last_sync
        jsonb design_tokens
        timestamp created_at
        timestamp updated_at
    }
    
    DESIGN_SYSTEM_PAGES {
        uuid id PK
        uuid design_system_id FK
        text page_id
        text page_name
        text page_type
        text content
        jsonb components
        jsonb guidelines
        jsonb examples
        timestamp created_at
        timestamp updated_at
    }
```

## Компоненты приложения

```mermaid
graph LR
    subgraph "React Application"
        A[App.jsx]
        B[Settings Panel]
        C[Actions Panel]
        D[Logs Panel]
        E[Preview Panel]
    end
    
    subgraph "Services"
        F[FigmaService]
        G[SupabaseService]
    end
    
    subgraph "Utils"
        H[Color Parser]
        I[Typography Analyzer]
        J[Component Extractor]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    
    C --> F
    C --> G
    
    F --> H
    F --> I
    F --> J
```

## Извлечение дизайн-токенов

```mermaid
flowchart TD
    Start[Начало обработки страницы] --> GetNode[Получить ноду]
    GetNode --> CheckType{Тип ноды?}
    
    CheckType -->|COMPONENT| ExtractComp[Извлечь компонент]
    CheckType -->|TEXT| ExtractTypo[Извлечь типографику]
    CheckType -->|FRAME/GROUP| CheckChildren{Есть дети?}
    
    ExtractComp --> SaveComp[Сохранить в components[]]
    ExtractTypo --> SaveTypo[Сохранить в typography]
    
    CheckChildren -->|Да| ProcessChildren[Обработать детей]
    CheckChildren -->|Нет| ExtractStyles[Извлечь стили]
    
    ProcessChildren --> GetNode
    
    ExtractStyles --> CheckFills{Есть fills?}
    CheckFills -->|Да| ExtractColors[Извлечь цвета]
    CheckFills -->|Нет| CheckStrokes{Есть strokes?}
    
    ExtractColors --> SaveColors[Добавить в colors Set]
    CheckStrokes -->|Да| ExtractBorders[Извлечь обводки]
    CheckStrokes -->|Нет| CheckEffects{Есть effects?}
    
    ExtractBorders --> SaveColors
    CheckEffects -->|Да| ExtractShadows[Извлечь тени]
    CheckEffects -->|Нет| CheckRadius{Есть radius?}
    
    ExtractShadows --> SaveShadows[Добавить в shadows[]]
    CheckRadius -->|Да| SaveRadius[Добавить в borderRadius Set]
    CheckRadius -->|Нет| CheckSpacing{Есть spacing?}
    
    SaveRadius --> CheckSpacing
    CheckSpacing -->|Да| SaveSpacing[Добавить в spacing Set]
    CheckSpacing -->|Нет| Done[Готово]
    
    SaveComp --> Done
    SaveTypo --> Done
    SaveColors --> Done
    SaveShadows --> Done
    SaveSpacing --> Done
```

## Обработка лимитов Figma

```mermaid
stateDiagram-v2
    [*] --> Idle: Приложение готово
    Idle --> Requesting: Начало синхронизации
    
    Requesting --> Processing: Получен ответ
    Requesting --> RateLimited: 429 Too Many Requests
    
    Processing --> Waiting: Обработано < 9 запросов
    Processing --> Complete: Все страницы обработаны
    
    RateLimited --> Waiting: Ждем 60 секунд
    
    Waiting --> Requesting: Прошло 7 секунд
    
    Complete --> Saving: Нажата кнопка "Сохранить"
    Saving --> Success: Данные сохранены
    Success --> [*]
    
    note right of RateLimited
        Figma лимит:
        - 9 запросов/минуту
        - 1000 запросов/час
    end note
    
    note right of Waiting
        Пауза 7 секунд
        между запросами
    end note
```

## Деплой процесс

```mermaid
flowchart LR
    A[📝 Код на GitHub] --> B{Netlify<br/>Auto Deploy}
    B -->|Trigger| C[npm install]
    C --> D[npm run build]
    D --> E{Build<br/>успешен?}
    E -->|Да| F[Deploy в CDN]
    E -->|Нет| G[Показать ошибку]
    F --> H[✅ Сайт онлайн]
    G --> I[📧 Email уведомление]
```

---

Эти диаграммы помогут понять, как работает система и как данные перемещаются между компонентами!
