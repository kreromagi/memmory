-- Создание таблицы для хранения основной информации о дизайн-системах
CREATE TABLE design_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  figma_file_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  last_modified TIMESTAMP,
  last_sync TIMESTAMP NOT NULL DEFAULT NOW(),
  design_tokens JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание таблицы для хранения страниц дизайн-системы
CREATE TABLE design_system_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_system_id UUID NOT NULL REFERENCES design_systems(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_type TEXT,
  content TEXT,
  components JSONB,
  guidelines JSONB,
  examples JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_design_systems_file_key ON design_systems(figma_file_key);
CREATE INDEX idx_design_system_pages_system_id ON design_system_pages(design_system_id);
CREATE INDEX idx_design_system_pages_type ON design_system_pages(page_type);
CREATE INDEX idx_design_system_pages_content ON design_system_pages USING GIN(to_tsvector('english', content));

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_design_systems_updated_at BEFORE UPDATE ON design_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_system_pages_updated_at BEFORE UPDATE ON design_system_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем Row Level Security (RLS)
ALTER TABLE design_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_system_pages ENABLE ROW LEVEL SECURITY;

-- Создаем политики доступа (настройте под ваши нужды)
-- Эти политики разрешают всем пользователям полный доступ
-- В продакшене нужно настроить более строгие правила
CREATE POLICY "Enable all access for design_systems" ON design_systems
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for design_system_pages" ON design_system_pages
  FOR ALL USING (true) WITH CHECK (true);

-- Комментарии к таблицам
COMMENT ON TABLE design_systems IS 'Основная информация о дизайн-системах из Figma';
COMMENT ON TABLE design_system_pages IS 'Детальная информация о страницах дизайн-системы';

-- Комментарии к колонкам
COMMENT ON COLUMN design_systems.figma_file_key IS 'Уникальный идентификатор файла в Figma';
COMMENT ON COLUMN design_systems.design_tokens IS 'JSON с дизайн-токенами (цвета, типографика, отступы и т.д.)';
COMMENT ON COLUMN design_system_pages.content IS 'Текстовый контент страницы для полнотекстового поиска';
COMMENT ON COLUMN design_system_pages.components IS 'JSON массив компонентов на странице';
COMMENT ON COLUMN design_system_pages.guidelines IS 'JSON массив руководств на странице';
COMMENT ON COLUMN design_system_pages.examples IS 'JSON массив примеров на странице';
