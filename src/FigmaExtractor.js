/**
 * FigmaExtractor — Main orchestrator for Figma API requests with rate limiting
 */
class FigmaExtractor {
    constructor(token, fileKey, logger) {
        this.token = token;
        this.fileKey = fileKey;
        this.logger = logger;
        this.baseUrl = 'https://api.figma.com/v1';
        this.requestCount = 0;
        this.lastRequestTime = 0;
        this.MIN_INTERVAL = 7000; // 7 seconds between requests
        this.MAX_REQUESTS_PER_MINUTE = 9;
        this.requestsThisMinute = 0;
        this.minuteStart = Date.now();
    }

    /**
     * Rate-limited fetch
     */
    async apiFetch(endpoint) {
        // Check rate limit
        const now = Date.now();
        if (now - this.minuteStart > 60000) {
            this.requestsThisMinute = 0;
            this.minuteStart = now;
        }

        if (this.requestsThisMinute >= this.MAX_REQUESTS_PER_MINUTE) {
            const waitTime = 60000 - (now - this.minuteStart) + 1000;
            this.logger.warning(`Лимит запросов. Ожидание ${Math.ceil(waitTime / 1000)} сек...`);
            await Utils.delay(waitTime);
            this.requestsThisMinute = 0;
            this.minuteStart = Date.now();
        }

        // Ensure minimum interval
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_INTERVAL && this.requestCount > 0) {
            const wait = this.MIN_INTERVAL - timeSinceLastRequest;
            this.logger.info(`Ожидание ${Math.ceil(wait / 1000)} сек (rate limit)...`);
            await Utils.delay(wait);
        }

        const url = `${this.baseUrl}${endpoint}`;
        this.logger.info(`API запрос: ${endpoint.substring(0, 80)}...`);

        try {
            const response = await fetch(url, {
                headers: {
                    'X-Figma-Token': this.token
                }
            });

            this.lastRequestTime = Date.now();
            this.requestCount++;
            this.requestsThisMinute++;

            if (!response.ok) {
                if (response.status === 429) {
                    this.logger.warning('Rate limit! Ожидание 60 сек...');
                    await Utils.delay(60000);
                    return this.apiFetch(endpoint); // Retry
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            this.logger.error(`Ошибка API: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get file metadata (pages list)
     */
    async getFileInfo() {
        this.logger.step('Получение информации о файле...');
        const data = await this.apiFetch(`/files/${this.fileKey}?depth=1`);
        this.logger.success(`Файл: "${data.name}"`);
        this.logger.data(`Страниц: ${data.document.children.length}`);
        return data;
    }

    /**
     * Get specific page data (nodes)
     */
    async getPageData(pageId) {
        const data = await this.apiFetch(`/files/${this.fileKey}/nodes?ids=${encodeURIComponent(pageId)}`);
        return data;
    }

    /**
     * Get file styles (published styles)
     */
    async getFileStyles() {
        try {
            this.logger.step('Получение стилей файла...');
            const data = await this.apiFetch(`/files/${this.fileKey}/styles`);
            return data;
        } catch (e) {
            this.logger.warning('Не удалось получить стили: ' + e.message);
            return null;
        }
    }

    /**
     * Get file components (published components)
     */
    async getFileComponents() {
        try {
            this.logger.step('Получение компонентов файла...');
            const data = await this.apiFetch(`/files/${this.fileKey}/components`);
            return data;
        } catch (e) {
            this.logger.warning('Не удалось получить компоненты: ' + e.message);
            return null;
        }
    }

    /**
     * Test connection to Figma
     */
    async testConnection() {
        const data = await this.apiFetch(`/files/${this.fileKey}?depth=1`);
        return { success: true, fileName: data.name, pages: data.document.children.length };
    }

    /**
     * Full sync — page by page
     */
    async fullSync(supabaseClient, onProgress) {
        const startTime = Date.now();
        this.logger.step('════════════════════════════════════════');
        this.logger.step('НАЧАЛО СИНХРОНИЗАЦИИ С FIGMA');
        this.logger.step('════════════════════════════════════════');

        // Step 1: Get file info
        const fileInfo = await this.getFileInfo();
        const pages = fileInfo.document.children;
        const totalPages = pages.length;

        // Step 2: Create sync session in Supabase
        const session = await supabaseClient.createSyncSession(this.fileKey, fileInfo.name);
        const sessionId = session.id;
        this.logger.success(`Сессия синхронизации создана: ${sessionId}`);

        await supabaseClient.updateSyncSession(sessionId, { total_pages: totalPages });

        // Step 3: Get styles and components metadata
        const stylesData = await this.getFileStyles();
        await Utils.delay(this.MIN_INTERVAL);
        const componentsData = await this.getFileComponents();

        // Step 4: Process each page
        let allColors = [];
        let allTypography = [];
        let allComponents = [];
        let allSpacing = [];
        let allShadows = [];
        let allLayouts = [];
        let allGuidelines = [];
        let allMemory = [];

        for (let i = 0; i < totalPages; i++) {
            const page = pages[i];
            const pageNum = i + 1;
            const percent = Math.round((pageNum / totalPages) * 100);

            this.logger.step(`────────────────────────────────────`);
            this.logger.step(`Страница ${pageNum}/${totalPages}: "${page.name}"`);
            this.logger.step(`────────────────────────────────────`);

            if (onProgress) {
                onProgress({
                    current: pageNum,
                    total: totalPages,
                    percent,
                    pageName: page.name,
                    status: 'loading'
                });
            }

            try {
                // Fetch page data from API
                this.logger.info(`Загрузка данных страницы "${page.name}"...`);
                const pageData = await this.getPageData(page.id);

                if (!pageData || !pageData.nodes || !pageData.nodes[page.id]) {
                    this.logger.warning(`Нет данных для страницы "${page.name}"`);
                    continue;
                }

                const pageNode = pageData.nodes[page.id].document;
                const pageType = Utils.detectPageType(page.name);

                // Save page to Supabase
                const savedPage = await supabaseClient.savePage({
                    sync_session_id: sessionId,
                    figma_page_id: page.id,
                    page_name: page.name,
                    page_type: pageType,
                    page_order: i,
                    raw_data: {}, // Don't store raw to save space
                    analysis: { nodeCount: Utils.countNodes(pageNode) }
                });

                const pageId = savedPage.id;

                // Analyze page
                const analyzer = new PageAnalyzer(sessionId, this.logger);
                const analysis = analyzer.analyze(pageNode, pageId);

                // Generate memory entries
                const memory = analyzer.generateMemory(analysis, page.name, pageId);

                // Accumulate results
                allColors = allColors.concat(analysis.colors);
                allTypography = allTypography.concat(analysis.typography);
                allComponents = allComponents.concat(analysis.components);
                allSpacing = allSpacing.concat(analysis.spacing);
                allShadows = allShadows.concat(analysis.shadows);
                allLayouts = allLayouts.concat(analysis.layouts);
                allGuidelines = allGuidelines.concat(analysis.guidelines);
                allMemory = allMemory.concat(memory);

                // Save to Supabase
                this.logger.info('Сохранение данных в Supabase...');
                await supabaseClient.saveColors(analysis.colors);
                await supabaseClient.saveTypography(analysis.typography);
                await supabaseClient.saveComponents(analysis.components);
                await supabaseClient.saveSpacing(analysis.spacing);
                await supabaseClient.saveShadows(analysis.shadows);
                await supabaseClient.saveLayout(analysis.layouts);
                await supabaseClient.saveGuidelines(analysis.guidelines);
                await supabaseClient.saveMemory(memory);

                // Update session progress
                await supabaseClient.updateSyncSession(sessionId, {
                    pages_processed: pageNum
                });

                this.logger.success(`Страница "${page.name}" обработана`);

                if (onProgress) {
                    onProgress({
                        current: pageNum,
                        total: totalPages,
                        percent,
                        pageName: page.name,
                        status: 'done'
                    });
                }

            } catch (err) {
                this.logger.error(`Ошибка на странице "${page.name}": ${err.message}`);
            }
        }

        // Step 5: Finalize
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        await supabaseClient.updateSyncSession(sessionId, {
            status: 'completed',
            sync_finished_at: new Date().toISOString(),
            metadata: {
                total_colors: allColors.length,
                total_typography: allTypography.length,
                total_components: allComponents.length,
                total_spacing: allSpacing.length,
                total_shadows: allShadows.length,
                total_layouts: allLayouts.length,
                total_guidelines: allGuidelines.length,
                total_memory: allMemory.length,
                elapsed_seconds: elapsed,
                api_requests: this.requestCount
            }
        });

        this.logger.step('════════════════════════════════════════');
        this.logger.success(`СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА за ${elapsed} сек`);
        this.logger.data(`API запросов: ${this.requestCount}`);
        this.logger.data(`Цветов: ${allColors.length}`);
        this.logger.data(`Типографика: ${allTypography.length}`);
        this.logger.data(`Компонентов: ${allComponents.length}`);
        this.logger.data(`Отступов: ${allSpacing.length}`);
        this.logger.data(`Теней: ${allShadows.length}`);
        this.logger.data(`Layout: ${allLayouts.length}`);
        this.logger.data(`Руководств: ${allGuidelines.length}`);
        this.logger.data(`Записей памяти: ${allMemory.length}`);
        this.logger.step('════════════════════════════════════════');

        return {
            sessionId,
            colors: allColors,
            typography: allTypography,
            components: allComponents,
            spacing: allSpacing,
            shadows: allShadows,
            layouts: allLayouts,
            guidelines: allGuidelines,
            memory: allMemory
        };
    }
}
