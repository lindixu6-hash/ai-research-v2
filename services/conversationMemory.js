/**
 * 对话历史管理器
 * 记录和管理用户的对话历史
 *
 * 功能：
 * - 添加对话
 * - 查找相似问题
 * - 获取最近历史
 * - 清除历史
 *
 * 创建时间：2026-05-15
 */

class ConversationMemory {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
    this.history = [];
    this.load();
  }

  /**
   * 添加对话记录
   */
  async add(query, answer, intent, searchResult) {
    const record = {
      id: this.generateId(),
      timestamp: Date.now(),
      query,
      answer,
      intent: intent.intent,
      confidence: searchResult.confidence,
      rounds: searchResult.rounds,
      results: searchResult.totalFound
    };

    this.history.unshift(record);

    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    await this.save();
    return record;
  }

  /**
   * 查找相似问题
   */
  async findSimilar(query) {
    const queryLower = query.toLowerCase().trim();

    // 简单相似度：完全匹配或包含
    for (const record of this.history) {
      const recordQuery = record.query.toLowerCase().trim();

      // 完全匹配
      if (recordQuery === queryLower) {
        return record;
      }

      // 包含匹配（查询是历史记录的子集）
      if (queryLower.length > 5 && recordQuery.includes(queryLower)) {
        return record;
      }

      // 历史记录是查询的子集
      if (recordQuery.length > 5 && queryLower.includes(recordQuery)) {
        return record;
      }
    }

    return null;
  }

  /**
   * 获取最近的记录
   */
  getRecent(count = 10) {
    return this.history.slice(0, count);
  }

  /**
   * 获取指定时间范围内的记录
   */
  getSince(timestamp) {
    return this.history.filter(r => r.timestamp >= timestamp);
  }

  /**
   * 获取指定意图的记录
   */
  getByIntent(intent) {
    return this.history.filter(r => r.intent === intent);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const intents = {};
    for (const record of this.history) {
      intents[record.intent] = (intents[record.intent] || 0) + 1;
    }

    return {
      total: this.history.length,
      intents,
      avgRounds: this.history.reduce((sum, r) => sum + r.rounds, 0) / Math.max(this.history.length, 1),
      avgConfidence: this.history.reduce((sum, r) => sum + r.confidence, 0) / Math.max(this.history.length, 1)
    };
  }

  /**
   * 清除历史
   */
  clear() {
    this.history = [];
    this.save();
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到存储
   */
  async save() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/conversation_history.jsonl');

      // 只保存最新的记录（追加模式）
      if (this.history.length > 0) {
        const latest = this.history[0];
        await fs.appendFile(filePath, JSON.stringify(latest) + '\n');
      }
    } catch (error) {
      console.error('[对话历史] 保存失败:', error.message);
    }
  }

  /**
   * 从存储加载
   */
  load() {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/conversation_history.jsonl');

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        // 加载最近的记录
        const loadCount = Math.min(lines.length, this.maxHistory);
        for (let i = 0; i < loadCount; i++) {
          try {
            const record = JSON.parse(lines[i]);
            this.history.push(record);
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      console.error('[对话历史] 加载失败:', error.message);
    }
  }

  /**
   * 导出历史
   */
  export() {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * 导入历史
   */
  import(data) {
    try {
      const records = typeof data === 'string' ? JSON.parse(data) : data;
      this.history = Array.isArray(records) ? records : [];
      this.save();
      return true;
    } catch (error) {
      console.error('[对话历史] 导入失败:', error.message);
      return false;
    }
  }
}

module.exports = ConversationMemory;
