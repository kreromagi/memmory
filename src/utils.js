/**
 * Utility functions
 */
const Utils = {
    /**
     * Convert Figma RGBA (0-1) to hex
     */
    rgbaToHex(r, g, b, a = 1) {
        const toHex = (val) => {
            const hex = Math.round(val * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        return a < 1 ? hex + toHex(a) : hex;
    },

    /**
     * Convert Figma color object to hex
     */
    figmaColorToHex(color, opacity = 1) {
        if (!color) return null;
        return Utils.rgbaToHex(color.r, color.g, color.b, opacity);
    },

    /**
     * Get CSS shadow string from Figma effect
     */
    figmaEffectToCSS(effect) {
        if (!effect || !effect.color) return null;
        const { offset, radius, spread, color } = effect;
        const x = offset?.x || 0;
        const y = offset?.y || 0;
        const blur = radius || 0;
        const spr = spread || 0;
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        const a = (color.a !== undefined ? color.a : 1).toFixed(2);
        const type = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
        return `${type}${x}px ${y}px ${blur}px ${spr}px rgba(${r},${g},${b},${a})`;
    },

    /**
     * Delay helper for rate limiting
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Categorize color by hue/saturation/lightness
     */
    categorizeColor(hex) {
        if (!hex) return 'other';
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const d = max - min;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

        let h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
            else if (max === g) h = ((b - r) / d + 2) * 60;
            else h = ((r - g) / d + 4) * 60;
        }

        // Very dark = likely text
        if (l < 0.15) return 'text';
        // Very light = likely background
        if (l > 0.92) return 'background';
        // Low saturation grays
        if (s < 0.1) {
            if (l < 0.4) return 'text';
            if (l > 0.7) return 'background';
            return 'border';
        }
        // Reds/oranges
        if ((h >= 0 && h < 15) || h >= 345) return 'status'; // error-ish
        // Greens
        if (h >= 100 && h < 160) return 'status'; // success-ish
        // Yellows/ambers
        if (h >= 35 && h < 60) return 'status'; // warning-ish
        // Blues
        if (h >= 200 && h < 250) {
            if (s > 0.5) return 'primary';
            return 'secondary';
        }
        // Purples
        if (h >= 250 && h < 310) return 'accent';

        return 'primary';
    },

    /**
     * Categorize typography by size
     */
    categorizeTypography(fontSize) {
        if (!fontSize) return 'body';
        if (fontSize >= 48) return 'display';
        if (fontSize >= 32) return 'heading';
        if (fontSize >= 24) return 'heading';
        if (fontSize >= 18) return 'subheading';
        if (fontSize >= 14) return 'body';
        if (fontSize >= 12) return 'caption';
        return 'label';
    },

    /**
     * Detect component type by name
     */
    detectComponentType(name) {
        const lower = (name || '').toLowerCase();
        const typeMap = {
            button: ['button', 'btn', 'cta'],
            input: ['input', 'field', 'textfield', 'textarea', 'search'],
            card: ['card'],
            modal: ['modal', 'dialog', 'popup', 'overlay'],
            navigation: ['nav', 'menu', 'sidebar', 'header', 'footer', 'breadcrumb', 'tab'],
            icon: ['icon', 'ico'],
            badge: ['badge', 'chip', 'pill'],
            tag: ['tag', 'label'],
            avatar: ['avatar', 'profile'],
            tooltip: ['tooltip', 'popover'],
            checkbox: ['checkbox', 'check'],
            radio: ['radio'],
            toggle: ['toggle', 'switch'],
            dropdown: ['dropdown', 'select', 'combobox'],
            table: ['table', 'grid', 'list'],
            alert: ['alert', 'notification', 'toast', 'snackbar'],
            progress: ['progress', 'loader', 'spinner', 'skeleton'],
            divider: ['divider', 'separator'],
            accordion: ['accordion', 'collapse', 'expand'],
            pagination: ['pagination', 'pager'],
            stepper: ['stepper', 'step', 'wizard'],
            slider: ['slider', 'range'],
        };

        for (const [type, keywords] of Object.entries(typeMap)) {
            if (keywords.some(kw => lower.includes(kw))) return type;
        }
        return 'unknown';
    },

    /**
     * Detect page type by name and content
     */
    detectPageType(pageName) {
        const lower = (pageName || '').toLowerCase();
        const typeMap = {
            colors: ['color', 'colour', 'palette', 'цвет'],
            typography: ['typo', 'font', 'text', 'шрифт', 'типограф'],
            icons: ['icon', 'иконк', 'пиктограм'],
            components: ['component', 'компонент', 'ui kit', 'элемент'],
            guidelines: ['guide', 'rule', 'principle', 'руководств', 'правил', 'гайд'],
            layout: ['layout', 'grid', 'spacing', 'сетк', 'отступ', 'лейаут'],
            shadows: ['shadow', 'elevation', 'тен', 'глубин'],
            tokens: ['token', 'variable', 'токен', 'перемен'],
            patterns: ['pattern', 'template', 'шаблон', 'паттерн'],
            overview: ['overview', 'intro', 'cover', 'обзор', 'обложк', 'начал', 'welcome', 'start'],
        };
        for (const [type, keywords] of Object.entries(typeMap)) {
            if (keywords.some(kw => lower.includes(kw))) return type;
        }
        return 'mixed';
    },

    /**
     * Normalize spacing value to nearest standard scale
     */
    normalizeSpacing(value) {
        const scale = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 160, 192, 224, 256];
        let closest = scale[0];
        let minDiff = Math.abs(value - closest);
        for (const s of scale) {
            const diff = Math.abs(value - s);
            if (diff < minDiff) {
                minDiff = diff;
                closest = s;
            }
        }
        return closest;
    },

    /**
     * Traverse Figma node tree and collect all nodes
     */
    traverseNodes(node, callback, depth = 0) {
        callback(node, depth);
        if (node.children) {
            for (const child of node.children) {
                Utils.traverseNodes(child, callback, depth + 1);
            }
        }
    },

    /**
     * Count total nodes in a tree
     */
    countNodes(node) {
        let count = 1;
        if (node.children) {
            for (const child of node.children) {
                count += Utils.countNodes(child);
            }
        }
        return count;
    },

    /**
     * Generate unique ID
     */
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Truncate string
     */
    truncate(str, max = 200) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '...' : str;
    }
};
