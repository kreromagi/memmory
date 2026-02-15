class FigmaService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.figma.com/v1';
    this.requestDelay = 7000;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchFromFigma(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async extractAllPages(fileKey, onProgress) {
    onProgress('Получение структуры файла...');
    const fileData = await this.fetchFromFigma(`/files/${fileKey}`);
    
    const pages = fileData.document.children.filter(child => child.type === 'CANVAS');
    onProgress(`Найдено страниц: ${pages.length}`);
    
    const extractedData = {
      fileName: fileData.name,
      lastModified: fileData.lastModified,
      pages: [],
      designTokens: {
        colors: new Set(),
        typography: {
          fontFamilies: new Set(),
          fontSizes: new Set(),
          fontWeights: new Set(),
          lineHeights: new Set()
        },
        spacing: new Set(),
        borderRadius: new Set(),
        shadows: []
      }
    };

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      onProgress(`Обработка страницы ${i + 1}/${pages.length}: ${page.name}`);
      
      try {
        const pageData = await this.fetchFromFigma(`/files/${fileKey}/nodes?ids=${page.id}`);
        
        const pageAnalysis = {
          id: page.id,
          name: page.name,
          type: this.analyzePageType(page.name),
          content: this.extractPageContent(pageData.nodes[page.id]),
          components: [],
          guidelines: [],
          examples: []
        };

        this.analyzeNode(pageData.nodes[page.id].document, pageAnalysis, extractedData.designTokens);
        
        extractedData.pages.push(pageAnalysis);
        
        if (i < pages.length - 1) {
          onProgress(`Ожидание ${this.requestDelay / 1000} секунд перед следующим запросом...`);
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        onProgress(`Ошибка при обработке страницы ${page.name}: ${error.message}`);
      }
    }

    extractedData.designTokens.colors = Array.from(extractedData.designTokens.colors);
    extractedData.designTokens.typography.fontFamilies = Array.from(extractedData.designTokens.typography.fontFamilies);
    extractedData.designTokens.typography.fontSizes = Array.from(extractedData.designTokens.typography.fontSizes);
    extractedData.designTokens.typography.fontWeights = Array.from(extractedData.designTokens.typography.fontWeights);
    extractedData.designTokens.typography.lineHeights = Array.from(extractedData.designTokens.typography.lineHeights);
    extractedData.designTokens.spacing = Array.from(extractedData.designTokens.spacing);
    extractedData.designTokens.borderRadius = Array.from(extractedData.designTokens.borderRadius);

    onProgress('✅ Извлечение завершено!');
    return extractedData;
  }

  analyzePageType(pageName) {
    const name = pageName.toLowerCase();
    
    if (name.includes('color') || name.includes('цвет')) return 'colors';
    if (name.includes('typography') || name.includes('типограф') || name.includes('text')) return 'typography';
    if (name.includes('component') || name.includes('компонент')) return 'components';
    if (name.includes('spacing') || name.includes('отступ')) return 'spacing';
    if (name.includes('guide') || name.includes('руководство') || name.includes('guideline')) return 'guidelines';
    if (name.includes('example') || name.includes('пример')) return 'examples';
    if (name.includes('icon') || name.includes('иконк')) return 'icons';
    
    return 'other';
  }

  extractPageContent(node) {
    if (!node || !node.document) return '';
    
    const texts = [];
    this.extractTexts(node.document, texts);
    return texts.join('\n');
  }

  extractTexts(node, texts) {
    if (node.type === 'TEXT' && node.characters) {
      texts.push(node.characters);
    }
    
    if (node.children) {
      node.children.forEach(child => this.extractTexts(child, texts));
    }
  }

  analyzeNode(node, pageAnalysis, designTokens) {
    if (!node) return;

    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      pageAnalysis.components.push({
        id: node.id,
        name: node.name,
        description: node.description || ''
      });
    }

    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const color = this.rgbaToHex(fill.color, fill.opacity);
          designTokens.colors.add(color);
        }
      });
    }

    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach(stroke => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const color = this.rgbaToHex(stroke.color, stroke.opacity);
          designTokens.colors.add(color);
        }
      });
    }

    if (node.style) {
      if (node.style.fontFamily) {
        designTokens.typography.fontFamilies.add(node.style.fontFamily);
      }
      if (node.style.fontSize) {
        designTokens.typography.fontSizes.add(node.style.fontSize);
      }
      if (node.style.fontWeight) {
        designTokens.typography.fontWeights.add(node.style.fontWeight);
      }
      if (node.style.lineHeightPx) {
        designTokens.typography.lineHeights.add(node.style.lineHeightPx);
      }
    }

    if (node.paddingLeft !== undefined) {
      designTokens.spacing.add(node.paddingLeft);
    }
    if (node.paddingRight !== undefined) {
      designTokens.spacing.add(node.paddingRight);
    }
    if (node.paddingTop !== undefined) {
      designTokens.spacing.add(node.paddingTop);
    }
    if (node.paddingBottom !== undefined) {
      designTokens.spacing.add(node.paddingBottom);
    }
    if (node.itemSpacing !== undefined) {
      designTokens.spacing.add(node.itemSpacing);
    }

    if (node.cornerRadius !== undefined) {
      designTokens.borderRadius.add(node.cornerRadius);
    }

    if (node.effects && Array.isArray(node.effects)) {
      node.effects.forEach(effect => {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          designTokens.shadows.push({
            type: effect.type,
            color: this.rgbaToHex(effect.color, effect.color.a),
            offset: { x: effect.offset.x, y: effect.offset.y },
            radius: effect.radius,
            spread: effect.spread || 0
          });
        }
      });
    }

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        this.analyzeNode(child, pageAnalysis, designTokens);
      });
    }
  }

  rgbaToHex(color, opacity = 1) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = opacity !== undefined ? opacity : (color.a !== undefined ? color.a : 1);
    
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    if (a < 1) {
      const alpha = Math.round(a * 255).toString(16).padStart(2, '0');
      return `${hex}${alpha}`;
    }
    
    return hex;
  }
}

export default FigmaService;
