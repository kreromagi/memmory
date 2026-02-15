/**
 * ColorExtractor — Extracts colors from Figma nodes
 */
class ColorExtractor {
    constructor() {
        this.colors = new Map(); // hex -> color data
    }

    extract(node, pageId, sessionId) {
        // Extract fills
        if (node.fills && Array.isArray(node.fills)) {
            for (const fill of node.fills) {
                if (fill.type === 'SOLID' && fill.visible !== false) {
                    this._addColor(fill.color, fill.opacity, 'fill', node, pageId, sessionId);
                }
            }
        }

        // Extract strokes
        if (node.strokes && Array.isArray(node.strokes)) {
            for (const stroke of node.strokes) {
                if (stroke.type === 'SOLID' && stroke.visible !== false) {
                    this._addColor(stroke.color, stroke.opacity, 'stroke', node, pageId, sessionId);
                }
            }
        }

        // Extract from effects (shadow colors)
        if (node.effects && Array.isArray(node.effects)) {
            for (const effect of node.effects) {
                if (effect.visible !== false && effect.color) {
                    this._addColor(effect.color, effect.color.a, 'effect', node, pageId, sessionId);
                }
            }
        }
    }

    _addColor(color, opacity, sourceType, node, pageId, sessionId) {
        if (!color) return;
        const hex = Utils.figmaColorToHex(color, opacity !== undefined ? opacity : 1);
        if (!hex) return;

        const key = hex.toUpperCase();
        if (this.colors.has(key)) {
            const existing = this.colors.get(key);
            existing.usage_count++;
            return;
        }

        const category = Utils.categorizeColor(hex);
        
        this.colors.set(key, {
            sync_session_id: sessionId,
            page_id: pageId,
            color_name: node.name || null,
            hex_value: key,
            rgba: { r: color.r, g: color.g, b: color.b, a: opacity || 1 },
            opacity: opacity || 1,
            category: category,
            source_type: sourceType,
            figma_style_id: node.styles?.fill || node.styles?.fills || null,
            figma_style_name: null,
            usage_count: 1
        });
    }

    getResults() {
        return Array.from(this.colors.values());
    }

    clear() {
        this.colors.clear();
    }
}
