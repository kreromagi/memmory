/**
 * LayoutExtractor — Extracts layout specs, spacing, border-radius, shadows
 */
class LayoutExtractor {
    constructor() {
        this.spacing = new Map();
        this.shadows = [];
        this.layouts = [];
    }

    extract(node, pageId, sessionId) {
        // Extract spacing (padding, gap)
        this._extractSpacing(node, pageId, sessionId);
        // Extract border radius
        this._extractBorderRadius(node, pageId, sessionId);
        // Extract shadows
        this._extractShadows(node, pageId, sessionId);
        // Extract layout properties
        this._extractLayout(node, pageId, sessionId);
    }

    _extractSpacing(node, pageId, sessionId) {
        // Auto-layout padding
        if (node.paddingTop !== undefined || node.paddingBottom !== undefined ||
            node.paddingLeft !== undefined || node.paddingRight !== undefined) {
            const values = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft].filter(v => v > 0);
            for (const val of values) {
                this._addSpacing('padding', val, node.name, pageId, sessionId);
            }
        }

        // Item spacing (gap)
        if (node.itemSpacing !== undefined && node.itemSpacing > 0) {
            this._addSpacing('gap', node.itemSpacing, node.name, pageId, sessionId);
        }
    }

    _extractBorderRadius(node, pageId, sessionId) {
        if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
            this._addSpacing('border-radius', node.cornerRadius, node.name, pageId, sessionId);
        }
        // Individual corners
        const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
        for (const corner of corners) {
            if (node[corner] !== undefined && node[corner] > 0) {
                this._addSpacing('border-radius', node[corner], node.name, pageId, sessionId);
            }
        }
    }

    _extractShadows(node, pageId, sessionId) {
        if (!node.effects || !Array.isArray(node.effects)) return;

        for (const effect of node.effects) {
            if (effect.visible === false) continue;
            if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
                const cssValue = Utils.figmaEffectToCSS(effect);
                this.shadows.push({
                    sync_session_id: sessionId,
                    page_id: pageId,
                    shadow_name: node.name,
                    shadow_type: effect.type,
                    color: effect.color ? {
                        r: effect.color.r,
                        g: effect.color.g,
                        b: effect.color.b,
                        a: effect.color.a
                    } : null,
                    offset_x: effect.offset?.x || 0,
                    offset_y: effect.offset?.y || 0,
                    blur_radius: effect.radius || 0,
                    spread_radius: effect.spread || 0,
                    css_value: cssValue,
                    figma_style_id: node.styles?.effect || null
                });
            }
        }
    }

    _extractLayout(node, pageId, sessionId) {
        if (node.layoutMode && node.layoutMode !== 'NONE') {
            // Detect layout element type
            const lower = (node.name || '').toLowerCase();
            let elementType = 'container';
            if (lower.includes('header') || lower.includes('шапка')) elementType = 'header';
            else if (lower.includes('sidebar') || lower.includes('боковой')) elementType = 'sidebar';
            else if (lower.includes('footer') || lower.includes('подвал')) elementType = 'footer';
            else if (lower.includes('content') || lower.includes('контент')) elementType = 'content';
            else if (lower.includes('grid') || lower.includes('сетка')) elementType = 'grid';

            this.layouts.push({
                sync_session_id: sessionId,
                page_id: pageId,
                element_name: node.name,
                element_type: elementType,
                width: node.absoluteBoundingBox?.width || null,
                height: node.absoluteBoundingBox?.height || null,
                padding: {
                    top: node.paddingTop || 0,
                    right: node.paddingRight || 0,
                    bottom: node.paddingBottom || 0,
                    left: node.paddingLeft || 0
                },
                layout_mode: node.layoutMode,
                item_spacing: node.itemSpacing || 0,
                constraints: node.constraints || null,
                properties: {
                    primaryAxisAlignItems: node.primaryAxisAlignItems,
                    counterAxisAlignItems: node.counterAxisAlignItems,
                    layoutGrow: node.layoutGrow,
                    layoutAlign: node.layoutAlign
                }
            });
        }
    }

    _addSpacing(type, value, sourceName, pageId, sessionId) {
        const key = `${type}-${value}`;
        if (this.spacing.has(key)) {
            this.spacing.get(key).usage_count++;
            return;
        }
        this.spacing.set(key, {
            sync_session_id: sessionId,
            page_id: pageId,
            spacing_type: type,
            value: value,
            normalized_value: Utils.normalizeSpacing(value),
            source_element: sourceName || '',
            usage_count: 1
        });
    }

    getSpacing() {
        return Array.from(this.spacing.values());
    }

    getShadows() {
        // Deduplicate shadows by CSS value
        const unique = new Map();
        for (const shadow of this.shadows) {
            const key = shadow.css_value || `${shadow.offset_x}-${shadow.offset_y}-${shadow.blur_radius}`;
            if (!unique.has(key)) {
                unique.set(key, shadow);
            }
        }
        return Array.from(unique.values());
    }

    getLayouts() {
        return this.layouts;
    }

    clear() {
        this.spacing.clear();
        this.shadows = [];
        this.layouts = [];
    }
}
