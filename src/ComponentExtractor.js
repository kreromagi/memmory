/**
 * ComponentExtractor — Extracts components and their properties
 */
class ComponentExtractor {
    constructor() {
        this.components = [];
    }

    extract(node, pageId, sessionId) {
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
            this._extractComponent(node, pageId, sessionId);
        }
        // Also extract instances for usage analysis
        if (node.type === 'INSTANCE') {
            this._extractInstance(node, pageId, sessionId);
        }
    }

    _extractComponent(node, pageId, sessionId) {
        const componentType = Utils.detectComponentType(node.name);
        const variants = [];
        
        // If it's a COMPONENT_SET, extract variants
        if (node.type === 'COMPONENT_SET' && node.children) {
            for (const child of node.children) {
                if (child.type === 'COMPONENT') {
                    variants.push({
                        id: child.id,
                        name: child.name,
                        properties: this._parseVariantName(child.name)
                    });
                }
            }
        }

        // Extract component properties
        const properties = {};
        if (node.componentPropertyDefinitions) {
            for (const [key, prop] of Object.entries(node.componentPropertyDefinitions)) {
                properties[key] = {
                    type: prop.type,
                    defaultValue: prop.defaultValue,
                    variantOptions: prop.variantOptions || []
                };
            }
        }

        this.components.push({
            sync_session_id: sessionId,
            page_id: pageId,
            figma_component_id: node.id,
            component_name: node.name,
            component_type: componentType,
            description: node.description || '',
            properties: properties,
            variants: variants,
            has_guidelines: false,
            guideline_text: null,
            example_descriptions: [],
            bounding_box: node.absoluteBoundingBox || null,
            children_count: node.children ? node.children.length : 0
        });
    }

    _extractInstance(node, pageId, sessionId) {
        // Track instances for understanding which components are most used
        // (optional - can be used for analysis)
    }

    _parseVariantName(name) {
        // Parse "Property=Value, Property2=Value2" format
        const props = {};
        const parts = name.split(',').map(p => p.trim());
        for (const part of parts) {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value) {
                props[key] = value;
            }
        }
        return props;
    }

    getResults() {
        return this.components;
    }

    clear() {
        this.components = [];
    }
}
