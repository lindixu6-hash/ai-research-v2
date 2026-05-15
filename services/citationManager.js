/**
 * 引用管理器
 * 为报告添加来源引用
 *
 * 创建时间：2026-05-15
 */

class CitationManager {
  constructor() {
    this.citations = [];
    this.citationIndex = 1;
  }

  /**
   * 从搜索结果提取信息并记录引用
   */
  extractWithCitation(result, fact) {
    const citation = {
      index: this.citationIndex++,
      source: this.extractSourceName(result),
      url: result.url,
      title: result.title,
      publishedDate: this.extractDate(result)
    };

    this.citations.push(citation);

    return {
      fact,
      citation: `[${citation.index}]`,
      source: citation.source
    };
  }

  /**
   * 提取来源名称
   */
  extractSourceName(result) {
    if (!result.url) return '未知来源';

    try {
      const url = new URL(result.url);
      const domain = url.hostname.replace('www.', '');

      // 友好名称映射
      const names = {
        'perplexity.ai': 'Perplexity',
        'blog.google': 'Google Blog',
        'openai.com': 'OpenAI',
        'anthropic.com': 'Anthropic',
        'wikipedia.org': 'Wikipedia',
        'github.com': 'GitHub',
        'stackoverflow.com': 'Stack Overflow',
        'medium.com': 'Medium',
        'linkedin.com': 'LinkedIn',
        'forbes.com': 'Forbes',
        'bloomberg.com': 'Bloomberg',
        'techcrunch.com': 'TechCrunch',
        'nytimes.com': 'New York Times',
        'wsj.com': 'Wall Street Journal',
        'economist.com': 'The Economist',
        'nature.com': 'Nature',
        'science.org': 'Science',
        'arxiv.org': 'arXiv'
      };

      return names[domain] || domain;
    } catch {
      return '未知来源';
    }
  }

  /**
   * 提取发布日期
   */
  extractDate(result) {
    return result.publishedDate || result.date || result.publishedDate || null;
  }

  /**
   * 生成引用列表
   */
  generateCitationList() {
    if (this.citations.length === 0) {
      return '';
    }

    let text = '\n\n## 参考来源\n\n';

    for (const citation of this.citations) {
      text += `[${citation.index}] ${citation.source}`;
      if (citation.title) {
        text += ` - ${citation.title}`;
      }
      text += `\n    ${citation.url}\n`;
    }

    return text;
  }

  /**
   * 重置引用
   */
  reset() {
    this.citations = [];
    this.citationIndex = 1;
  }

  /**
   * 获取当前引用数
   */
  getCount() {
    return this.citations.length;
  }

  /**
   * 获取所有引用
   */
  getAll() {
    return this.citations;
  }
}

module.exports = CitationManager;
