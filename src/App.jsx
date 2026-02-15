import React, { useState } from 'react';
import FigmaService from './services/figmaService';
import SupabaseService from './services/supabaseService';
import './App.css';

function App() {
  const [figmaApiKey, setFigmaApiKey] = useState('');
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [logs, setLogs] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [showSettings, setShowSettings] = useState(true);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setLogs(prev => [...prev, { time: timestamp, message }]);
  };

  const handleExtract = async () => {
    if (!figmaApiKey || !figmaFileKey) {
      addLog('❌ Пожалуйста, введите API-ключ Figma и ID файла');
      return;
    }

    setIsExtracting(true);
    setLogs([]);
    setExtractedData(null);

    try {
      addLog('🚀 Начинаем извлечение данных из Figma...');
      
      const figmaService = new FigmaService(figmaApiKey);
      
      const data = await figmaService.extractAllPages(figmaFileKey, (message) => {
        addLog(message);
      });

      setExtractedData(data);
      addLog('✅ Данные успешно извлечены!');
      addLog(`📊 Страниц обработано: ${data.pages.length}`);
      addLog(`🎨 Цветов найдено: ${data.designTokens.colors.length}`);
      addLog(`📝 Шрифтов найдено: ${data.designTokens.typography.fontFamilies.length}`);

    } catch (error) {
      addLog(`❌ Ошибка: ${error.message}`);
      console.error(error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveToSupabase = async () => {
    if (!extractedData) {
      addLog('❌ Сначала извлеките данные из Figma');
      return;
    }

    if (!supabaseUrl || !supabaseKey) {
      addLog('❌ Пожалуйста, введите URL и ключ Supabase');
      return;
    }

    try {
      addLog('💾 Сохранение в Supabase...');
      
      const supabaseService = new SupabaseService(supabaseUrl, supabaseKey);
      await supabaseService.saveDesignSystemData(figmaFileKey, extractedData);
      
      addLog('✅ Данные успешно сохранены в Supabase!');
    } catch (error) {
      addLog(`❌ Ошибка сохранения: ${error.message}`);
      console.error(error);
    }
  };

  const handleDownloadJSON = () => {
    if (!extractedData) {
      addLog('❌ Нет данных для скачивания');
      return;
    }

    const dataStr = JSON.stringify(extractedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `design-system-${figmaFileKey}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    addLog('✅ JSON файл скачан');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎨 Figma Design System Extractor</h1>
        <p>Извлечение и анализ дизайн-систем из Figma с сохранением в Supabase</p>
      </header>

      <main className="main">
        {showSettings && (
          <section className="settings-section">
            <div className="settings-header">
              <h2>⚙️ Настройки</h2>
              <button 
                className="toggle-btn"
                onClick={() => setShowSettings(false)}
              >
                Свернуть
              </button>
            </div>

            <div className="settings-group">
              <h3>Figma API</h3>
              <div className="input-group">
                <label>API-ключ Figma:</label>
                <input
                  type="password"
                  value={figmaApiKey}
                  onChange={(e) => setFigmaApiKey(e.target.value)}
                  placeholder="figd_xxxxxxxxxxxxx"
                  disabled={isExtracting}
                />
                <small>
                  Получите ключ в: Figma → Settings → Personal Access Tokens
                </small>
              </div>

              <div className="input-group">
                <label>ID файла Figma:</label>
                <input
                  type="text"
                  value={figmaFileKey}
                  onChange={(e) => setFigmaFileKey(e.target.value)}
                  placeholder="Например: abc123def456"
                  disabled={isExtracting}
                />
                <small>
                  Найдите в URL: figma.com/file/[ID_ФАЙЛА]/...
                </small>
              </div>
            </div>

            <div className="settings-group">
              <h3>Supabase</h3>
              <div className="input-group">
                <label>URL Supabase:</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div className="input-group">
                <label>Anon ключ Supabase:</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            </div>
          </section>
        )}

        {!showSettings && (
          <button 
            className="toggle-btn"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ Показать настройки
          </button>
        )}

        <section className="actions-section">
          <h2>🚀 Действия</h2>
          <div className="actions-buttons">
            <button
              className="btn btn-primary"
              onClick={handleExtract}
              disabled={isExtracting}
            >
              {isExtracting ? '⏳ Извлечение...' : '📥 Синхронизировать с Figma'}
            </button>

            {extractedData && (
              <>
                <button
                  className="btn btn-success"
                  onClick={handleSaveToSupabase}
                  disabled={isExtracting}
                >
                  💾 Сохранить в Supabase
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleDownloadJSON}
                >
                  💿 Скачать JSON
                </button>
              </>
            )}
          </div>
        </section>

        <section className="logs-section">
          <h2>📋 Логи</h2>
          <div className="logs-container">
            {logs.length === 0 ? (
              <p className="logs-empty">Логи появятся здесь после начала работы...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-time">[{log.time}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {extractedData && (
          <section className="preview-section">
            <h2>👁️ Предварительный просмотр данных</h2>
            
            <div className="preview-grid">
              <div className="preview-card">
                <h3>📊 Общая информация</h3>
                <p><strong>Файл:</strong> {extractedData.fileName}</p>
                <p><strong>Страниц:</strong> {extractedData.pages.length}</p>
                <p><strong>Последнее изменение:</strong> {new Date(extractedData.lastModified).toLocaleString('ru-RU')}</p>
              </div>

              <div className="preview-card">
                <h3>🎨 Цвета</h3>
                <p><strong>Всего:</strong> {extractedData.designTokens.colors.length}</p>
                <div className="color-palette">
                  {extractedData.designTokens.colors.slice(0, 12).map((color, i) => (
                    <div
                      key={i}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="preview-card">
                <h3>📝 Типографика</h3>
                <p><strong>Шрифтов:</strong> {extractedData.designTokens.typography.fontFamilies.length}</p>
                <p><strong>Размеров:</strong> {extractedData.designTokens.typography.fontSizes.length}</p>
                <p><strong>Начертаний:</strong> {extractedData.designTokens.typography.fontWeights.length}</p>
              </div>

              <div className="preview-card">
                <h3>📏 Отступы и скругления</h3>
                <p><strong>Отступов:</strong> {extractedData.designTokens.spacing.length}</p>
                <p><strong>Скруглений:</strong> {extractedData.designTokens.borderRadius.length}</p>
                <p><strong>Теней:</strong> {extractedData.designTokens.shadows.length}</p>
              </div>
            </div>

            <div className="pages-list">
              <h3>📄 Страницы</h3>
              {extractedData.pages.map((page, i) => (
                <div key={i} className="page-item">
                  <span className="page-name">{page.name}</span>
                  <span className={`page-type page-type-${page.type}`}>{page.type}</span>
                  {page.components.length > 0 && (
                    <span className="page-badge">🧩 {page.components.length} компонентов</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Made with ❤️ for design system teams</p>
        <p>⚠️ Лимит Figma API: максимум 9 запросов в минуту</p>
      </footer>
    </div>
  );
}

export default App;
