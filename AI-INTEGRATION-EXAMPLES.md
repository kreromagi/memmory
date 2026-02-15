# 🤖 Примеры использования с AI/нейросетями

## Пример 1: Чат-бот о дизайн-системе (Python)

```python
from supabase import create_client
import openai

# Настройка Supabase
supabase = create_client(
    "YOUR_SUPABASE_URL",
    "YOUR_SUPABASE_KEY"
)

# Функция для получения контекста из дизайн-системы
def get_design_system_context(query):
    # Поиск релевантных страниц
    response = supabase.table('design_system_pages')\
        .select('*')\
        .ilike('content', f'%{query}%')\
        .limit(5)\
        .execute()
    
    context = ""
    for page in response.data:
        context += f"\n\nСтраница: {page['page_name']}\n"
        context += f"Тип: {page['page_type']}\n"
        context += f"Контент: {page['content'][:500]}...\n"
        
        if page['components']:
            context += f"Компоненты: {', '.join([c['name'] for c in page['components']])}\n"
    
    return context

# Функция для ответа на вопрос о дизайн-системе
def ask_design_system(question):
    # Получаем контекст
    context = get_design_system_context(question)
    
    # Формируем промпт для AI
    prompt = f"""
    Ты — эксперт по нашей дизайн-системе. 
    Используй следующую информацию для ответа на вопрос:
    
    {context}
    
    Вопрос: {question}
    
    Ответ:
    """
    
    # Отправляем в OpenAI/Claude
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Ты эксперт по дизайн-системам."},
            {"role": "user", "content": prompt}
        ]
    )
    
    return response.choices[0].message.content

# Использование
answer = ask_design_system("Какой основной цвет используется для кнопок?")
print(answer)
```

## Пример 2: RAG (Retrieval-Augmented Generation) система

```python
from supabase import create_client
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import SupabaseVectorStore
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA

# Настройка
supabase = create_client("YOUR_URL", "YOUR_KEY")
embeddings = OpenAIEmbeddings()

# Создание векторного хранилища
vector_store = SupabaseVectorStore(
    client=supabase,
    embedding=embeddings,
    table_name="design_system_pages",
    query_name="match_design_system_pages"
)

# Создание QA цепочки
qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4"),
    chain_type="stuff",
    retriever=vector_store.as_retriever(search_kwargs={"k": 3})
)

# Использование
question = "Как использовать компонент кнопки?"
answer = qa_chain.run(question)
print(answer)
```

## Пример 3: Slack бот с доступом к дизайн-системе

```python
from slack_bolt import App
from supabase import create_client

app = App(token="YOUR_SLACK_TOKEN")
supabase = create_client("YOUR_URL", "YOUR_KEY")

@app.message("дизайн")
def handle_design_question(message, say):
    question = message['text']
    
    # Поиск в дизайн-системе
    results = supabase.table('design_system_pages')\
        .select('*')\
        .textSearch('content', question)\
        .limit(3)\
        .execute()
    
    if results.data:
        response = "Нашел в дизайн-системе:\n\n"
        for page in results.data:
            response += f"• *{page['page_name']}*: {page['content'][:200]}...\n"
    else:
        response = "Ничего не нашел в дизайн-системе 😕"
    
    say(response)

if __name__ == "__main__":
    app.start(port=3000)
```

## Пример 4: Автоматическая генерация документации

```python
from supabase import create_client
import anthropic

supabase = create_client("YOUR_URL", "YOUR_KEY")
client = anthropic.Anthropic(api_key="YOUR_KEY")

def generate_documentation():
    # Получаем все данные
    design_system = supabase.table('design_systems').select('*').limit(1).single().execute()
    pages = supabase.table('design_system_pages').select('*').execute()
    
    # Формируем контекст
    context = f"""
    Дизайн-система: {design_system.data['file_name']}
    
    Дизайн-токены:
    - Цвета: {len(design_system.data['design_tokens']['colors'])}
    - Шрифты: {design_system.data['design_tokens']['typography']}
    
    Страницы:
    """
    
    for page in pages.data:
        context += f"\n- {page['page_name']} ({page['page_type']})"
        if page['components']:
            context += f"\n  Компоненты: {len(page['components'])}"
    
    # Генерируем документацию с Claude
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""
            Создай подробную документацию для этой дизайн-системы в формате Markdown:
            
            {context}
            
            Включи:
            1. Обзор системы
            2. Руководство по использованию
            3. Список всех компонентов
            4. Дизайн-токены
            """
        }]
    )
    
    # Сохраняем документацию
    with open('design-system-docs.md', 'w') as f:
        f.write(message.content[0].text)

generate_documentation()
```

## Пример 5: Поиск похожих компонентов

```python
from supabase import create_client
import json

supabase = create_client("YOUR_URL", "YOUR_KEY")

def find_similar_components(component_name, threshold=0.7):
    # Получаем все компоненты
    pages = supabase.table('design_system_pages')\
        .select('page_name, components')\
        .not_('components', 'is', None)\
        .execute()
    
    similar = []
    
    for page in pages.data:
        if page['components']:
            for component in page['components']:
                if component_name.lower() in component['name'].lower():
                    similar.append({
                        'page': page['page_name'],
                        'component': component['name'],
                        'description': component.get('description', '')
                    })
    
    return similar

# Использование
results = find_similar_components("button")
for result in results:
    print(f"- {result['component']} на странице {result['page']}")
```

## Пример 6: Мониторинг изменений дизайн-системы

```python
from supabase import create_client
import schedule
import time
from datetime import datetime

supabase = create_client("YOUR_URL", "YOUR_KEY")

def check_updates():
    # Получаем последнюю синхронизацию
    latest = supabase.table('design_systems')\
        .select('last_sync, file_name')\
        .order('last_sync', desc=True)\
        .limit(1)\
        .single()\
        .execute()
    
    last_sync = datetime.fromisoformat(latest.data['last_sync'])
    now = datetime.now()
    
    hours_since = (now - last_sync).total_seconds() / 3600
    
    if hours_since > 24:
        print(f"⚠️ Дизайн-система '{latest.data['file_name']}' не обновлялась {hours_since:.1f} часов!")
        # Отправить уведомление в Slack/Email
    else:
        print(f"✅ Дизайн-система актуальна (обновлена {hours_since:.1f} часов назад)")

# Запускаем проверку каждый час
schedule.every().hour.do(check_updates)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Пример 7: API endpoint для вашего приложения

```python
from fastapi import FastAPI
from supabase import create_client

app = FastAPI()
supabase = create_client("YOUR_URL", "YOUR_KEY")

@app.get("/api/design-tokens")
def get_design_tokens():
    """Получить все дизайн-токены"""
    result = supabase.table('design_systems')\
        .select('design_tokens')\
        .limit(1)\
        .single()\
        .execute()
    return result.data['design_tokens']

@app.get("/api/components")
def get_components():
    """Получить список всех компонентов"""
    pages = supabase.table('design_system_pages')\
        .select('page_name, components')\
        .not_('components', 'is', None)\
        .execute()
    
    all_components = []
    for page in pages.data:
        if page['components']:
            all_components.extend(page['components'])
    
    return {"total": len(all_components), "components": all_components}

@app.get("/api/search")
def search(q: str):
    """Поиск по дизайн-системе"""
    results = supabase.table('design_system_pages')\
        .select('*')\
        .or_(f"page_name.ilike.%{q}%,content.ilike.%{q}%")\
        .execute()
    
    return {"results": results.data}

# Запуск: uvicorn main:app --reload
```

## Полезные SQL запросы для Supabase

```sql
-- Получить все уникальные цвета
SELECT DISTINCT jsonb_array_elements_text(design_tokens->'colors') as color
FROM design_systems;

-- Найти страницы с компонентами кнопок
SELECT page_name, components
FROM design_system_pages
WHERE components::text ILIKE '%button%';

-- Статистика по типам страниц
SELECT page_type, COUNT(*) as count
FROM design_system_pages
GROUP BY page_type;

-- Полнотекстовый поиск
SELECT page_name, content
FROM design_system_pages
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'button & primary');
```

---

## 💡 Советы по интеграции

1. **Кеширование**: Кешируйте часто используемые данные
2. **Векторизация**: Используйте embeddings для семантического поиска
3. **Обновления**: Настройте автоматическую ре-синхронизацию
4. **Версионирование**: Сохраняйте историю изменений
5. **Мониторинг**: Отслеживайте использование API

Эти примеры помогут вам начать использовать данные вашей дизайн-системы в AI-приложениях!
