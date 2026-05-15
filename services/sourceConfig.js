/**
 * 搜索信源优先级配置
 *
 * 优先级规则：
 * 1. 国内权威信源 > 通用信源
 * 2. 准确率高的新闻 > 社交媒体
 * 3. 同类信源按优先级排序
 */

module.exports = {
  // 国内信源优先级（从高到低）
  domestic: {
    // 一级：权威新闻/官方（准确率最高）
    tier1: [
      { domain: 'news.cn', name: '新华社', priority: 1, type: 'news' },
      { domain: 'people.com.cn', name: '人民日报', priority: 1, type: 'news' },
      { domain: 'cctv.com', name: '央视网', priority: 1, type: 'news' },
      { domain: 'gov.cn', name: '政府网站', priority: 1, type: 'official' },
      { domain: 'xinhuanet.com', name: '新华网', priority: 1, type: 'news' }
    ],

    // 二级：专业媒体/平台（准确率高）
    tier2: [
      { domain: 'thepaper.cn', name: '澎湃新闻', priority: 2, type: 'news' },
      { domain: 'caixin.com', name: '财新网', priority: 2, type: 'news' },
      { domain: '36kr.com', name: '36氪', priority: 2, type: 'tech' },
      { domain: 'ifanr.com', name: '爱范儿', priority: 2, type: 'tech' },
      { domain: 'geekpark.net', name: '极客公园', priority: 2, type: 'tech' }
    ],

    // 三级：知识社区（有参考价值）
    tier3: [
      { domain: 'xiaohongshu.com', name: '小红书', priority: 3, type: 'social' },
      { domain: 'zhihu.com', name: '知乎', priority: 3, type: 'social' },
      { domain: 'bilibili.com', name: 'B站', priority: 3, type: 'video' },
      { domain: 'weixin.qq.com', name: '微信公众号', priority: 3, type: 'article' }
    ]
  },

  // 国际信源优先级
  international: {
    tier1: [
      { domain: 'reuters.com', name: '路透社', priority: 1, type: 'news' },
      { domain: 'apnews.com', name: '美联社', priority: 1, type: 'news' },
      { domain: 'bbc.com', name: 'BBC', priority: 1, type: 'news' },
      { domain: 'nytimes.com', name: '纽约时报', priority: 1, type: 'news' }
    ],

    tier2: [
      { domain: 'techcrunch.com', name: 'TechCrunch', priority: 2, type: 'tech' },
      { domain: 'wired.com', name: 'WIRED', priority: 2, type: 'tech' },
      { domain: 'theverge.com', name: 'The Verge', priority: 2, type: 'tech' }
    ]
  },

  // 通用搜索引擎（作为补充）
  searchEngines: {
    google: { name: 'Google', priority: 4, enabled: true },
    bing: { name: 'Bing', priority: 5, enabled: true }
  },

  /**
   * 根据查询类型获取推荐信源
   */
  getSourcesForQuery(queryType, language = 'zh') {
    const sources = language === 'zh' ? this.domestic : this.international;

    switch (queryType) {
      case 'news':
        // 新闻查询：优先新闻源
        return [...sources.tier1.filter(s => s.type === 'news'), ...sources.tier2.filter(s => s.type === 'news')];

      case 'tech':
        // 科技查询：优先科技媒体
        return [...sources.tier2.filter(s => s.type === 'tech'), ...sources.tier3];

      case 'social':
        // 社交查询：优先社区
        return sources.tier3;

      default:
        // 默认：按优先级全部返回
        return [...sources.tier1, ...sources.tier2, ...sources.tier3];
    }
  },

  /**
   * 生成 site: 搜索字符串
   */
  getSiteFilters(queryType = 'general', language = 'zh') {
    const sources = this.getSourcesForQuery(queryType, language);

    return sources.map(s => `site:${s.domain}`).join(' OR ');
  },

  /**
   * 获取优先级最高的域名
   */
  getTopDomains(count = 5, language = 'zh') {
    const sources = language === 'zh' ? this.domestic : this.international;
    const allSources = [...sources.tier1, ...sources.tier2, ...sources.tier3];

    return allSources
      .sort((a, b) => a.priority - b.priority)
      .slice(0, count)
      .map(s => s.domain);
  }
};
