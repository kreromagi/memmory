/**
 * PageAnalyzer — Analyzes a Figma page and extracts all design data
 */
class PageAnalyzer {
    constructor(sessionId, logger) {
        this.sessionId = sessionId;
        this.logger = logger;
        this.colorExtractor = new ColorExtractor();
        this.typographyExtractor = new TypographyExtractor();
        this.componentExtractor = new ComponentExtractor();
        this.layoutExtractor = new LayoutExtractor();
        this.guidelineDetector = new GuidelineDetector();
    }

    analyze(pageNode, pageId) {
        const pageName = pageNode.name || 'Unknown Page';
        const pageType = Utils.detectPageType(pageName);
        
        this.logger.step(`Анализ страницы: "${pageName}" (тип: ${pageType})`);

        // Reset extractors for this page
        this.colorExtractor.clear();
        this.typographyExtractor.clear();
        this.componentExtractor.clear();
        this.layoutExtractor.clear();
        this.guidelineDetector.clear();

        let nodeCount = 0;

        // Traverse all nodes on the page
        Utils.traverseNodes(pageNode, (node, depth) => {
            nodeCount++;
            this.colorExtractor.extract(node, pageId, this.sessionId);
            this.typographyExtractor.extract(node, pageId, this.sessionId);
            this.componentExtractor.extract(node, pageId, this.sessionId);
            this.layoutExtractor.extract(node, pageId, this.sessionId);
            this.guidelineDetector.extract(node, pageId, this.sessionId);
        });

        const colors = this.colorExtractor.getResults();
        const typography = this.typographyExtractor.getResults();
        const components = this.componentExtractor.getResults();
        const spacing = this.layoutExtractor.getSpacing();
        const shadows = this.layoutExtractor.getShadows();
        const layouts = this.layoutExtractor.getLayouts();
        const guidelines = this.guidelineDetector.getResults();

        this.logger.data(`Обработано ${nodeCount} нод`);
        this.logger.data(`Цветов: ${colors.length}, Типографика: ${typography.length}, Компонентов: ${components.length}`);
        this.logger.data(`Отступов: ${spacing.length}, Теней: ${shadows.length}, Layout: ${layouts.length}, Руководств: ${guidelines.length}`);

        return {
            pageType,
            nodeCount,
            colors,
            typography,
            components,
            spacing,
            shadows,
            layouts,
            guidelines
        };
    }

    /**
     * Generate memory entries from analyzed data
     */
    generateMemory(analysis, pageName, pageId) {
        const memory = [];

        // Colors memory
        if (analysis.colors.length > 0) {
            const colorsByCategory = {};
            for (const c of analysis.colors) {
                if (!colorsByCategory[c.category]) colorsByCategory[c.category] = [];
                colorsByCategory[c.category].push(c.hex_value);
            }
            let colorText = `Цветовая палитра со страницы "${pageName}":\n`;
            for (const [cat, hexes] of Object.entries(colorsByCategory)) {
                colorText += `  ${cat}: ${[...new Set(hexes)].join(', ')}\n`;
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'colors',
                subcategory: null,
                title: `Цвета — ${pageName}`,
                content: colorText,
                structured_data: colorsByCategory,
                embedding_text: colorText,
                page_source: pageName,
                importance: 0.8
            });
        }

        // Typography memory
        if (analysis.typography.length > 0) {
            let typoText = `Типографика со страницы "${pageName}":\n`;
            for (const t of analysis.typography) {
                typoText += `  ${t.category}: ${t.font_family} ${t.font_size}px/${t.font_weight}\n`;
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'typography',
                subcategory: null,
                title: `Типографика — ${pageName}`,
                content: typoText,
                structured_data: analysis.typography.map(t => ({
                    family: t.font_family,
                    size: t.font_size,
                    weight: t.font_weight,
                    category: t.category
                })),
                embedding_text: typoText,
                page_source: pageName,
                importance: 0.8
            });
        }

        // Components memory
        if (analysis.components.length > 0) {
            let compText = `Компоненты со страницы "${pageName}":\n`;
            for (const c of analysis.components) {
                compText += `  ${c.component_name} (тип: ${c.component_type})`;
                if (c.description) compText += ` — ${c.description}`;
                if (c.variants && c.variants.length > 0) {
                    compText += ` [${c.variants.length} вариантов]`;
                }
                compText += '\n';
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'components',
                subcategory: null,
                title: `Компоненты — ${pageName}`,
                content: compText,
                structured_data: analysis.components.map(c => ({
                    name: c.component_name,
                    type: c.component_type,
                    variants: c.variants.length,
                    description: c.description
                })),
                embedding_text: compText,
                page_source: pageName,
                importance: 0.9
            });
        }

        // Spacing memory
        if (analysis.spacing.length > 0) {
            const spacingByType = {};
            for (const s of analysis.spacing) {
                if (!spacingByType[s.spacing_type]) spacingByType[s.spacing_type] = new Set();
                spacingByType[s.spacing_type].add(s.normalized_value);
            }
            let spacingText = `Отступы и скругления со страницы "${pageName}":\n`;
            for (const [type, values] of Object.entries(spacingByType)) {
                const sorted = [...values].sort((a, b) => a - b);
                spacingText += `  ${type}: ${sorted.join(', ')}px\n`;
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'spacing',
                subcategory: null,
                title: `Отступы — ${pageName}`,
                content: spacingText,
                structured_data: Object.fromEntries(
                    Object.entries(spacingByType).map(([k, v]) => [k, [...v].sort((a, b) => a - b)])
                ),
                embedding_text: spacingText,
                page_source: pageName,
                importance: 0.6
            });
        }

        // Shadows memory
        if (analysis.shadows.length > 0) {
            let shadowText = `Тени со страницы "${pageName}":\n`;
            for (const s of analysis.shadows) {
                shadowText += `  ${s.shadow_name}: ${s.css_value}\n`;
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'shadows',
                subcategory: null,
                title: `Тени — ${pageName}`,
                content: shadowText,
                structured_data: analysis.shadows.map(s => ({
                    name: s.shadow_name,
                    css: s.css_value,
                    type: s.shadow_type
                })),
                embedding_text: shadowText,
                page_source: pageName,
                importance: 0.5
            });
        }

        // Layout memory
        if (analysis.layouts.length > 0) {
            let layoutText = `Layout спецификации со страницы "${pageName}":\n`;
            for (const l of analysis.layouts) {
                layoutText += `  ${l.element_name} (${l.element_type}): ${l.layout_mode}, `;
                layoutText += `${l.width ? l.width + 'px' : 'auto'} × ${l.height ? l.height + 'px' : 'auto'}, `;
                layoutText += `gap: ${l.item_spacing}px\n`;
            }
            memory.push({
                sync_session_id: this.sessionId,
                category: 'layout',
                subcategory: null,
                title: `Layout — ${pageName}`,
                content: layoutText,
                structured_data: analysis.layouts.map(l => ({
                    name: l.element_name,
                    type: l.element_type,
                    mode: l.layout_mode,
                    width: l.width,
                    height: l.height,
                    gap: l.item_spacing
                })),
                embedding_text: layoutText,
                page_source: pageName,
                importance: 0.7
            });
        }

        // Guidelines memory
        if (analysis.guidelines.length > 0) {
            for (const g of analysis.guidelines) {
                memory.push({
                    sync_session_id: this.sessionId,
                    category: 'guidelines',
                    subcategory: g.guideline_type,
                    title: g.title || `Руководство — ${pageName}`,
                    content: g.content,
                    structured_data: {
                        type: g.guideline_type,
                        related_component: g.related_component,
                        tags: g.tags
                    },
                    embedding_text: `${g.title || ''}\n${g.content}`,
                    page_source: pageName,
                    importance: 0.85
                });
            }
        }

        return memory;
    }
}
