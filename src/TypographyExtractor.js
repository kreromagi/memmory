/**
 * TypographyExtractor — Extracts typography styles from TEXT nodes
 */
class TypographyExtractor {
    constructor() {
        this.styles = new Map(); // key -> style data
    }

    extract(node, pageId, sessionId) {
        if (node.type !== 'TEXT') return;

        const style = node.style;
        if (!style) return;

        const fontFamily = style.fontFamily || 'Unknown';
        const fontSize = style.fontSize || 16;
        const fontWeight = style.fontWeight || 400;
        const lineHeight = style.lineHeightPx ? { value: style.lineHeightPx, unit: 'px' } :
                          style.lineHeightPercent ? { value: style.lineHeightPercent, unit: '%' } :
                          style.lineHeightPercentFontSize ? { value: style.lineHeightPercentFontSize, unit: '% font-size' } :
                          { value: 'auto', unit: 'auto' };
        const letterSpacing = style.letterSpacing ? { value: style.letterSpacing, unit: 'px' } : { value: 0, unit: 'px' };

        const key = `${fontFamily}-${fontSize}-${fontWeight}`;

        if (this.styles.has(key)) return;

        this.styles.set(key, {
            sync_session_id: sessionId,
            page_id: pageId,
            style_name: node.name || null,
            font_family: fontFamily,
            font_size: fontSize,
            font_weight: fontWeight,
            line_height: lineHeight,
            letter_spacing: letterSpacing,
            text_decoration: style.textDecoration || 'NONE',
            text_case: style.textCase || 'ORIGINAL',
            paragraph_spacing: style.paragraphSpacing || 0,
            figma_style_id: node.styles?.text || null,
            figma_style_name: null,
            sample_text: Utils.truncate(node.characters, 100),
            category: Utils.categorizeTypography(fontSize)
        });
    }

    getResults() {
        return Array.from(this.styles.values());
    }

    clear() {
        this.styles.clear();
    }
}
