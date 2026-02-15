/**
 * App — Main UI controller
 */
(function () {
    // DOM Elements
    const $figmaToken = document.getElementById('figmaToken');
    const $figmaFileKey = document.getElementById('figmaFileKey');
    const $supabaseUrl = document.getElementById('supabaseUrl');
    const $supabaseKey = document.getElementById('supabaseKey');
    const $btnTestConnection = document.getElementById('btnTestConnection');
    const $btnSaveSettings = document.getElementById('btnSaveSettings');
    const $btnSync = document.getElementById('btnSync');
    const $btnExportJson = document.getElementById('btnExportJson');
    const $btnClearMemory = document.getElementById('btnClearMemory');
    const $btnClearLog = document.getElementById('btnClearLog');
    const $connectionStatus = document.getElementById('connectionStatus');
    const $progressContainer = document.getElementById('progressContainer');
    const $progressLabel = document.getElementById('progressLabel');
    const $progressPercent = document.getElementById('progressPercent');
    const $progressFill = document.getElementById('progressFill');
    const $progressDetails = document.getElementById('progressDetails');

    // Stat elements
    const $statPages = document.getElementById('statPages');
    const $statColors = document.getElementById('statColors');
    const $statTypo = document.getElementById('statTypo');
    const $statComponents = document.getElementById('statComponents');
    const $statShadows = document.getElementById('statShadows');
    const $statGuidelines = document.getElementById('statGuidelines');
    const $statMemory = document.getElementById('statMemory');

    // Initialize logger
    const logger = new Logger('logContainer');

    // State
    let supabaseClient = null;
    let lastSyncResult = null;
    let isSyncing = false;

    // ===== Load saved settings =====
    function loadSettings() {
        const saved = localStorage.getItem('figma_ds_settings');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.figmaToken) $figmaToken.value = s.figmaToken;
                if (s.figmaFileKey) $figmaFileKey.value = s.figmaFileKey;
                if (s.supabaseUrl) $supabaseUrl.value = s.supabaseUrl;
                if (s.supabaseKey) $supabaseKey.value = s.supabaseKey;
                logger.info('Настройки загружены из localStorage');
            } catch (e) { /* ignore */ }
        }
    }

    function saveSettings() {
        const settings = {
            figmaToken: $figmaToken.value.trim(),
            figmaFileKey: $figmaFileKey.value.trim(),
            supabaseUrl: $supabaseUrl.value.trim(),
            supabaseKey: $supabaseKey.value.trim()
        };
        localStorage.setItem('figma_ds_settings', JSON.stringify(settings));
        logger.success('Настройки сохранены');
    }

    // ===== Connection Status =====
    function setStatus(status, text) {
        const dot = $connectionStatus.querySelector('.status-dot');
        const span = $connectionStatus.querySelector('span:last-child');
        dot.className = `status-dot status-dot--${status}`;
        span.textContent = text;
    }

    // ===== Progress =====
    function showProgress(show) {
        $progressContainer.style.display = show ? 'block' : 'none';
    }

    function updateProgress(data) {
        $progressLabel.textContent = `Страница ${data.current}/${data.total}: ${data.pageName}`;
        $progressPercent.textContent = `${data.percent}%`;
        $progressFill.style.width = `${data.percent}%`;
        $progressDetails.textContent = data.status === 'loading' ? 'Загрузка...' : 'Готово';
    }

    // ===== Tabs =====
    function initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const panes = document.querySelectorAll('.tab-pane');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('tab--active'));
                panes.forEach(p => p.classList.remove('tab-pane--active'));
                tab.classList.add('tab--active');
                const pane = document.querySelector(`[data-pane="${tab.dataset.tab}"]`);
                if (pane) pane.classList.add('tab-pane--active');
            });
        });
    }

    // ===== Test Connection =====
    async function testConnection() {
        const figmaToken = $figmaToken.value.trim();
        const figmaFileKey = $figmaFileKey.value.trim();
        const sbUrl = $supabaseUrl.value.trim();
        const sbKey = $supabaseKey.value.trim();

        if (!figmaToken || !figmaFileKey) {
            logger.error('Укажите Figma Token и File Key');
            return;
        }
        if (!sbUrl || !sbKey) {
            logger.error('Укажите Supabase URL и Key');
            return;
        }

        $btnTestConnection.disabled = true;
        logger.step('Проверка подключения...');

        try {
            // Test Figma
            const extractor = new FigmaExtractor(figmaToken, figmaFileKey, logger);
            const figmaResult = await extractor.testConnection();
            logger.success(`Figma: файл "${figmaResult.fileName}", ${figmaResult.pages} страниц`);

            // Test Supabase
            supabaseClient = new SupabaseClient(sbUrl, sbKey);
            supabaseClient.init();
            await supabaseClient.testConnection();
            logger.success('Supabase: подключение успешно');

            setStatus('connected', 'Подключено');
        } catch (err) {
            logger.error(`Ошибка подключения: ${err.message}`);
            setStatus('disconnected', 'Ошибка подключения');
        } finally {
            $btnTestConnection.disabled = false;
        }
    }

    // ===== SYNC =====
    async function startSync() {
        if (isSyncing) return;

        const figmaToken = $figmaToken.value.trim();
        const figmaFileKey = $figmaFileKey.value.trim();
        const sbUrl = $supabaseUrl.value.trim();
        const sbKey = $supabaseKey.value.trim();

        if (!figmaToken || !figmaFileKey || !sbUrl || !sbKey) {
            logger.error('Заполните все поля настроек');
            return;
        }

        isSyncing = true;
        $btnSync.disabled = true;
        setStatus('syncing', 'Синхронизация...');
        showProgress(true);
        logger.clear();

        try {
            // Init clients
            supabaseClient = new SupabaseClient(sbUrl, sbKey);
            supabaseClient.init();

            const extractor = new FigmaExtractor(figmaToken, figmaFileKey, logger);

            // Run full sync
            lastSyncResult = await extractor.fullSync(supabaseClient, (progress) => {
                updateProgress(progress);
            });

            // Update UI with results
            updateStatsUI(lastSyncResult);
            updateDataPreview(lastSyncResult);

            setStatus('connected', 'Синхронизировано');
        } catch (err) {
            logger.error(`Критическая ошибка: ${err.message}`);
            setStatus('disconnected', 'Ошибка');
        } finally {
            isSyncing = false;
            $btnSync.disabled = false;
            showProgress(false);
        }
    }

    // ===== Update Stats UI =====
    function updateStatsUI(result) {
        $statColors.textContent = result.colors.length;
        $statTypo.textContent = result.typography.length;
        $statComponents.textContent = result.components.length;
        $statShadows.textContent = result.shadows.length;
        $statGuidelines.textContent = result.guidelines.length;
        $statMemory.textContent = result.memory.length;
    }

    // ===== Update Data Preview =====
    function updateDataPreview(result) {
        // Pages overview
        if (supabaseClient) {
            supabaseClient.getPages(result.sessionId).then(pages => {
                $statPages.textContent = pages.length;
                const $pagesOverview = document.getElementById('pagesOverview');
                $pagesOverview.innerHTML = pages.map(p => {
                    const icons = {
                        colors: '🎨', typography: '🔤', components: '🧩',
                        icons: '✨', guidelines: '📋', layout: '📐',
                        shadows: '🌑', tokens: '🔑', overview: '📄',
                        mixed: '📁', unknown: '📁', patterns: '🔲'
                    };
                    return `<div class="page-item">
                        <span class="page-item__icon">${icons[p.page_type] || '📁'}</span>
                        <span class="page-item__name">${p.page_name}</span>
                        <span class="page-item__type">${p.page_type}</span>
                    </div>`;
                }).join('');
            });
        }

        // Colors
        const $colorsContent = document.getElementById('colorsContent');
        if (result.colors.length > 0) {
            $colorsContent.innerHTML = `<div class="color-grid">
                ${result.colors.map(c => `
                    <div class="color-swatch">
                        <div class="color-swatch__preview" style="background:${c.hex_value}"></div>
                        <div class="color-swatch__info">
                            <div class="color-swatch__hex">${c.hex_value}</div>
                            <div class="color-swatch__name">${c.color_name || '—'}</div>
                            <span class="color-swatch__category">${c.category}</span>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        } else {
            $colorsContent.innerHTML = 'Цвета не найдены';
        }

        // Typography
        const $typoContent = document.getElementById('typographyContent');
        if (result.typography.length > 0) {
            $typoContent.innerHTML = result.typography.map(t => `
                <div class="typo-item">
                    <div class="typo-item__sample" style="font-family:'${t.font_family}';font-size:${Math.min(t.font_size, 32)}px;font-weight:${t.font_weight}">
                        ${t.sample_text || t.font_family}
                    </div>
                    <div class="typo-item__meta">
                        <span>${t.font_family}</span>
                        <span>${t.font_size}px</span>
                        <span>${t.font_weight}</span>
                        <span>${t.category}</span>
                    </div>
                </div>
            `).join('');
        } else {
            $typoContent.innerHTML = 'Типографика не найдена';
        }

        // Components
        const $compContent = document.getElementById('componentsContent');
        if (result.components.length > 0) {
            $compContent.innerHTML = result.components.map(c => `
                <div class="component-card">
                    <div class="component-card__name">${c.component_name}</div>
                    <div class="component-card__type">${c.component_type}</div>
                    ${c.description ? `<div class="component-card__desc">${c.description}</div>` : ''}
                    ${c.variants && c.variants.length > 0 ? `<div class="component-card__variants">Варианты: ${c.variants.length}</div>` : ''}
                </div>
            `).join('');
        } else {
            $compContent.innerHTML = 'Компоненты не найдены';
        }

        // Spacing
        const $spacingContent = document.getElementById('spacingContent');
        if (result.spacing.length > 0) {
            // Group by type
            const byType = {};
            for (const s of result.spacing) {
                if (!byType[s.spacing_type]) byType[s.spacing_type] = [];
                byType[s.spacing_type].push(s);
            }
            let html = '';
            for (const [type, items] of Object.entries(byType)) {
                const uniqueValues = [...new Set(items.map(i => i.normalized_value))].sort((a, b) => a - b);
                html += `<h3 style="font-size:13px;color:var(--color-text-secondary);margin:12px 0 8px">${type}</h3>`;
                html += `<div class="spacing-grid">${uniqueValues.map(v => `
                    <div class="spacing-item">
                        <div class="spacing-item__value">${v}</div>
                        <div class="spacing-item__type">px</div>
                    </div>
                `).join('')}</div>`;
            }
            $spacingContent.innerHTML = html;
        } else {
            $spacingContent.innerHTML = 'Отступы не найдены';
        }

        // Shadows
        const $shadowsContent = document.getElementById('shadowsContent');
        if (result.shadows.length > 0) {
            $shadowsContent.innerHTML = result.shadows.map(s => `
                <div class="shadow-item">
                    <div class="shadow-item__preview" style="box-shadow:${s.css_value}"></div>
                    <div>
                        <div style="font-size:13px;margin-bottom:4px">${s.shadow_name || '—'}</div>
                        <div class="shadow-item__css">${s.css_value}</div>
                    </div>
                </div>
            `).join('');
        } else {
            $shadowsContent.innerHTML = 'Тени не найдены';
        }

        // Guidelines
        const $guidelinesContent = document.getElementById('guidelinesContent');
        if (result.guidelines.length > 0) {
            $guidelinesContent.innerHTML = result.guidelines.map(g => `
                <div class="guideline-item">
                    <div class="guideline-item__title">${g.title || '—'}</div>
                    <div class="guideline-item__type">${g.guideline_type}</div>
                    <div class="guideline-item__content">${Utils.truncate(g.content, 300)}</div>
                </div>
            `).join('');
        } else {
            $guidelinesContent.innerHTML = 'Руководства не найдены';
        }

        // Memory
        const $memoryContent = document.getElementById('memoryContent');
        if (result.memory.length > 0) {
            $memoryContent.innerHTML = result.memory.map(m => `
                <div class="memory-item">
                    <span class="memory-item__category memory-item__category--${m.category}">${m.category}</span>
                    <strong style="font-size:13px">${m.title}</strong>
                    <div class="memory-item__text">${Utils.truncate(m.content, 200)}</div>
                </div>
            `).join('');
        } else {
            $memoryContent.innerHTML = 'Память пуста';
        }
    }

    // ===== Export JSON =====
    function exportJson() {
        if (!lastSyncResult) {
            logger.warning('Нет данных для экспорта. Сначала выполните синхронизацию.');
            return;
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            sessionId: lastSyncResult.sessionId,
            summary: {
                colors: lastSyncResult.colors.length,
                typography: lastSyncResult.typography.length,
                components: lastSyncResult.components.length,
                spacing: lastSyncResult.spacing.length,
                shadows: lastSyncResult.shadows.length,
                guidelines: lastSyncResult.guidelines.length,
                memory: lastSyncResult.memory.length
            },
            colors: lastSyncResult.colors,
            typography: lastSyncResult.typography,
            components: lastSyncResult.components,
            spacing: lastSyncResult.spacing,
            shadows: lastSyncResult.shadows,
            layouts: lastSyncResult.layouts,
            guidelines: lastSyncResult.guidelines,
            memory: lastSyncResult.memory
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `figma-ds-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logger.success('JSON экспортирован');
    }

    // ===== Clear Memory =====
    async function clearMemory() {
        if (!confirm('Удалить все данные из Supabase? Это действие необратимо.')) return;

        const sbUrl = $supabaseUrl.value.trim();
        const sbKey = $supabaseKey.value.trim();

        if (!sbUrl || !sbKey) {
            logger.error('Укажите Supabase настройки');
            return;
        }

        try {
            supabaseClient = new SupabaseClient(sbUrl, sbKey);
            supabaseClient.init();
            await supabaseClient.clearAllData();
            logger.success('Все данные удалены из Supabase');
            lastSyncResult = null;

            // Reset stats
            ['statPages', 'statColors', 'statTypo', 'statComponents', 'statShadows', 'statGuidelines', 'statMemory'].forEach(id => {
                document.getElementById(id).textContent = '—';
            });
        } catch (err) {
            logger.error(`Ошибка очистки: ${err.message}`);
        }
    }

    // ===== Event Listeners =====
    $btnTestConnection.addEventListener('click', testConnection);
    $btnSaveSettings.addEventListener('click', saveSettings);
    $btnSync.addEventListener('click', startSync);
    $btnExportJson.addEventListener('click', exportJson);
    $btnClearMemory.addEventListener('click', clearMemory);
    $btnClearLog.addEventListener('click', () => logger.clear());

    // ===== Init =====
    loadSettings();
    initTabs();
    logger.info('Figma DS Extractor готов к работе');
    logger.info('Заполните настройки и нажмите "Синхронизировать с Figma"');
})();
