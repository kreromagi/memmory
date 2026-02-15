/**
 * GuidelineDetector — Detects guideline/documentation text blocks
 */
class GuidelineDetector {
    constructor() {
        this.guidelines = [];
        // Keywords that indicate guideline content
        this.guidelineKeywords = [
            // English
            'do ', "don't", 'do not', 'avoid', 'always', 'never', 'should', 'must',
            'recommended', 'best practice', 'usage', 'when to use', 'how to',
            'guidelines', 'rules', 'principle', 'accessibility', 'a11y',
            'responsive', 'states', 'anatomy', 'behavior', 'interaction',
            'specification', 'spec', 'example', 'note:', 'important:',
            'tip:', 'warning:', 'caution:',
            // Russian
            'используй', 'не используй', 'всегда', 'никогда', 'следует', 'необходимо',
            'рекомендуется', 'рекомендация', 'правил', 'руководств', 'принцип',
            'доступност', 'адаптив', 'состояни', 'анатоми', 'поведени',
            'спецификаци', 'пример', 'примечани', 'важно', 'внимани',
            'описани', 'инструкци'
        ];
    }

    extract(node, pageId, sessionId) {
        if (node.type !== 'TEXT') return;
        if (!node.characters || node.characters.trim().length < 20) return;

        const text = node.characters.trim();
        const lower = text.toLowerCase();

        // Check if this text looks like a guideline
        const isGuideline = this._isGuidelineText(lower, node);
        if (!isGuideline) return;

        const guidelineType = this._detectGuidelineType(lower, node.name);

        this.guidelines.push({
            sync_session_id: sessionId,
            page_id: pageId,
            component_id: null,
            title: this._extractTitle(node, text),
            content: text,
            guideline_type: guidelineType,
            related_component: this._findRelatedComponent(node),
            tags: this._extractTags(text)
        });
    }

    _isGuidelineText(lowerText, node) {
        // Long descriptive text is likely a guideline
        if (lowerText.length > 100) {
            // Check for any guideline keywords
            for (const kw of this.guidelineKeywords) {
                if (lowerText.includes(kw)) return true;
            }
        }

        // Check node name for guideline indicators
        const lowerName = (node.name || '').toLowerCase();
        const nameIndicators = ['description', 'guide', 'note', 'rule', 'spec',
                                'описание', 'правило', 'заметка', 'руководство'];
        for (const ind of nameIndicators) {
            if (lowerName.includes(ind)) return true;
        }

        // Multi-line text with bullet points
        if (lowerText.includes('\n') && (lowerText.includes('•') || lowerText.includes('-') || lowerText.includes('·'))) {
            return true;
        }

        return false;
    }

    _detectGuidelineType(lowerText, nodeName) {
        const lowerName = (nodeName || '').toLowerCase();
        const combined = lowerText + ' ' + lowerName;

        if (combined.includes("don't") || combined.includes('do not') || combined.includes('не используй') ||
            combined.includes('avoid') || combined.includes('избегай')) return 'do_dont';
        if (combined.includes('accessib') || combined.includes('a11y') || combined.includes('доступност')) return 'accessibility';
        if (combined.includes('responsive') || combined.includes('adaptive') || combined.includes('адаптив') ||
            combined.includes('breakpoint')) return 'responsive';
        if (combined.includes('state') || combined.includes('hover') || combined.includes('focus') ||
            combined.includes('disabled') || combined.includes('состояни')) return 'states';
        if (combined.includes('anatomy') || combined.includes('structure') || combined.includes('анатоми') ||
            combined.includes('структур')) return 'anatomy';
        if (combined.includes('usage') || combined.includes('when to use') || combined.includes('использован')) return 'usage';

        return 'general';
    }

    _extractTitle(node, text) {
        // Use node name if meaningful
        if (node.name && !node.name.startsWith('Frame') && !node.name.startsWith('Group') &&
            !node.name.startsWith('Rectangle') && node.name.length > 2) {
            return node.name;
        }
        // Use first line of text
        const firstLine = text.split('\n')[0].trim();
        return Utils.truncate(firstLine, 80);
    }

    _findRelatedComponent(node) {
        // Try to find related component from node name or parent
        const name = (node.name || '').toLowerCase();
        const componentType = Utils.detectComponentType(name);
        return componentType !== 'unknown' ? componentType : null;
    }

    _extractTags(text) {
        const tags = [];
        const lower = text.toLowerCase();
        const tagChecks = {
            'accessibility': ['accessibility', 'a11y', 'screen reader', 'aria', 'доступност'],
            'responsive': ['responsive', 'mobile', 'desktop', 'tablet', 'breakpoint', 'адаптив'],
            'dark-mode': ['dark mode', 'dark theme', 'тёмная тема'],
            'animation': ['animation', 'transition', 'motion', 'анимац'],
            'interaction': ['hover', 'focus', 'click', 'tap', 'press'],
            'color': ['color', 'цвет', 'palette'],
            'spacing': ['spacing', 'padding', 'margin', 'gap', 'отступ'],
            'typography': ['font', 'text', 'шрифт', 'типограф'],
        };
        for (const [tag, keywords] of Object.entries(tagChecks)) {
            if (keywords.some(kw => lower.includes(kw))) {
                tags.push(tag);
            }
        }
        return tags;
    }

    getResults() {
        return this.guidelines;
    }

    clear() {
        this.guidelines = [];
    }
}
