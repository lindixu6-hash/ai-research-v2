/**
 * 用户画像管理器
 * 记录和管理用户偏好、行为模式
 *
 * 功能：
 * - 记录用户偏好
 * - 分析用户兴趣
 * - 个性化推荐
 * - 反馈收集
 *
 * 创建时间：2026-05-15
 */

class UserProfile {
  constructor(userId = 'default') {
    this.userId = userId;
    this.profile = {
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),

      // 偏好设置
      preferences: {
        preferBrief: true,           // 偏好简洁回答
        preferDetailed: false,       // 偏好详细回答
        language: 'zh-CN',          // 语言
        maxResults: 10,             // 默认结果数
        enableHistory: true         // 启用历史
      },

      // 行为统计
      stats: {
        totalQueries: 0,
        intents: {},                // 意图分布
        avgQualityScore: 0,         // 平均质量分
        feedbackCount: 0            // 反馈次数
      },

      // 兴趣标签
      interests: [],

      // 反馈记录
      feedbacks: []
    };

    this.load();
  }

  /**
   * 从查询更新用户画像
   */
  async updateFromQuery(query, intent, quality) {
    this.profile.stats.totalQueries++;

    // 更新意图统计
    const intentType = intent.intent;
    this.profile.stats.intents[intentType] = (this.profile.stats.intents[intentType] || 0) + 1;

    // 更新平均质量分
    const currentAvg = this.profile.stats.avgQualityScore;
    const newScore = quality.score;
    this.profile.stats.avgQualityScore =
      (currentAvg * (this.profile.stats.totalQueries - 1) + newScore) / this.profile.stats.totalQueries;

    // 提取兴趣标签
    this.extractInterests(query, intent);

    this.profile.updatedAt = Date.now();
    await this.save();
  }

  /**
   * 提取兴趣标签
   */
  extractInterests(query, intent) {
    // 简单提取：常见关键词
    const keywords = {
      'AI': ['AI', '人工智能', '机器学习', '深度学习', 'ChatGPT', 'GPT'],
      '产品': ['产品', 'PM', '产品经理', '需求'],
      '技术': ['编程', '代码', '开发', '前端', '后端', '架构'],
      '职场': ['面试', '求职', '简历', '薪资', '职业'],
      '金融': ['股票', '基金', '投资', '理财'],
      '健康': ['运动', '健身', '饮食', '营养'],
      '教育': ['学习', '课程', '教程', '培训']
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (query.includes(word)) {
          this.addInterest(category);
          break;
        }
      }
    }
  }

  /**
   * 添加兴趣标签
   */
  addInterest(interest) {
    // 检查是否已存在
    const existing = this.profile.interests.find(i => i.name === interest);
    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
    } else {
      this.profile.interests.push({
        name: interest,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }
  }

  /**
   * 添加反馈
   */
  async addFeedback(queryId, feedback) {
    const feedbackRecord = {
      queryId,
      rating: feedback.rating,        // 1-5星
      helpful: feedback.helpful,      // 是否有帮助
      issues: feedback.issues || [],  // 问题列表
      comment: feedback.comment || '',
      timestamp: Date.now()
    };

    this.profile.feedbacks.push(feedbackRecord);
    this.profile.stats.feedbackCount++;

    // 根据反馈调整偏好
    this.adjustPreferences(feedback);

    this.profile.updatedAt = Date.now();
    await this.save();
  }

  /**
   * 根据反馈调整偏好
   */
  adjustPreferences(feedback) {
    // 如果用户经常标记回答太长，偏好简洁
    if (feedback.issues && feedback.issues.some(i => i.type === 'too_long')) {
      this.profile.preferences.preferBrief = true;
      this.profile.preferences.preferDetailed = false;
    }

    // 如果用户经常标记回答不够详细，偏好详细
    if (feedback.issues && feedback.issues.some(i => i.type === 'too_short')) {
      this.profile.preferences.preferDetailed = true;
    }
  }

  /**
   * 获取用户上下文
   */
  async getContext() {
    // 获取最近活跃的兴趣
    const recentInterests = this.profile.interests
      .filter(i => Date.now() - i.lastSeen < 7 * 24 * 60 * 60 * 1000) // 7天内
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 5)
      .map(i => i.name);

    return {
      preferences: this.profile.preferences,
      interests: recentInterests,
      topIntent: this.getTopIntent(),
      avgQuality: this.profile.stats.avgQualityScore
    };
  }

  /**
   * 获取最常见的意图
   */
  getTopIntent() {
    const intents = this.profile.stats.intents;
    let topIntent = 'informational-simple';
    let maxCount = 0;

    for (const [intent, count] of Object.entries(intents)) {
      if (count > maxCount) {
        maxCount = count;
        topIntent = intent;
      }
    }

    return { intent: topIntent, count: maxCount };
  }

  /**
   * 获取偏好设置
   */
  getPreferences() {
    return { ...this.profile.preferences };
  }

  /**
   * 更新偏好
   */
  async updatePreferences(newPrefs) {
    this.profile.preferences = {
      ...this.profile.preferences,
      ...newPrefs
    };
    this.profile.updatedAt = Date.now();
    await this.save();
  }

  /**
   * 获取统计
   */
  getStats() {
    return {
      ...this.profile.stats,
      interests: this.profile.interests.length
    };
  }

  /**
   * 保存到存储
   */
  async save() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const dirPath = path.join(__dirname, '../../logs/users');
      const filePath = path.join(dirPath, `${this.userId}.json`);

      // 确保目录存在
      await fs.mkdir(dirPath, { recursive: true });

      await fs.writeFile(filePath, JSON.stringify(this.profile, null, 2));
    } catch (error) {
      console.error('[用户画像] 保存失败:', error.message);
    }
  }

  /**
   * 从存储加载
   */
  load() {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/users', `${this.userId}.json`);

      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        const saved = JSON.parse(data);

        // 合并保存的数据
        this.profile = {
          ...this.profile,
          ...saved,
          preferences: {
            ...this.profile.preferences,
            ...saved.preferences
          },
          stats: {
            ...this.profile.stats,
            ...saved.stats,
            intents: saved.stats?.intents || {}
          }
        };
      }
    } catch (error) {
      console.error('[用户画像] 加载失败:', error.message);
    }
  }

  /**
   * 导出
   */
  export() {
    return JSON.stringify(this.profile, null, 2);
  }

  /**
   * 重置
   */
  async reset() {
    this.profile.feedbacks = [];
    this.profile.stats.totalQueries = 0;
    this.profile.stats.intents = {};
    this.profile.stats.avgQualityScore = 0;
    this.profile.updatedAt = Date.now();
    await this.save();
  }
}

module.exports = UserProfile;
