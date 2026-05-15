/**
 * 数据看板页面
 * 展示搜索统计和性能指标
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Stats.css';

function Stats() {
  const [stats, setStats] = useState({
    totalSearches: 0,
    avgDuration: 0,
    intentDistribution: {},
    successRate: 0,
    recentSearches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/logs/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('获取统计数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const intentColors = {
    'informational-simple': '#10b981',
    'informational-complex': '#3b82f6',
    'navigational': '#8b5cf6',
    'transactional': '#f59e0b',
    'commercial': '#ef4444',
    'generative': '#ec4899',
    'research': '#06b6d4',
    'multi-part': '#6366f1'
  };

  const intentNames = {
    'informational-simple': '简单信息',
    'informational-complex': '复杂信息',
    'navigational': '导航',
    'transactional': '交易',
    'commercial': '商业对比',
    'generative': '生成',
    'research': '研究',
    'multi-part': '多部分'
  };

  if (loading) {
    return (
      <div className="stats-container">
        <div className="stats-loading">
          <div className="spinner"></div>
          <p>加载数据中...</p>
        </div>
      </div>
    );
  }

  const totalByIntent = Object.values(stats.intentDistribution || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="stats-container">
      <motion.header
        className="stats-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>📊 数据看板</h1>
        <p className="stats-subtitle">实时搜索指标与性能分析</p>
      </motion.header>

      {/* 核心指标卡片 */}
      <div className="stats-grid">
        <motion.div
          className="stat-card stat-primary"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <p className="stat-label">总搜索次数</p>
            <p className="stat-value">{stats.totalSearches.toLocaleString()}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card stat-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <p className="stat-label">平均响应时间</p>
            <p className="stat-value">{stats.avgDuration.toFixed(1)}s</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card stat-info"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <p className="stat-label">成功率</p>
            <p className="stat-value">{(stats.successRate * 100).toFixed(0)}%</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card stat-warning"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <p className="stat-label">平均搜索轮数</p>
            <p className="stat-value">{stats.avgRounds?.toFixed(1) || '-'}</p>
          </div>
        </motion.div>
      </div>

      {/* 意图分布 */}
      <motion.div
        className="stats-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2>📋 意图类型分布</h2>
        <div className="intent-distribution">
          {Object.entries(stats.intentDistribution || {}).map(([intent, count]) => {
            const percentage = totalByIntent > 0 ? (count / totalByIntent * 100).toFixed(0) : 0;
            return (
              <div key={intent} className="intent-bar-wrapper">
                <div className="intent-info">
                  <span className="intent-name">{intentNames[intent] || intent}</span>
                  <span className="intent-count">{count} 次 ({percentage}%)</span>
                </div>
                <div className="intent-bar">
                  <motion.div
                    className="intent-bar-fill"
                    style={{ backgroundColor: intentColors[intent] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 最近搜索 */}
      <motion.div
        className="stats-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <h2>🕐 最近搜索</h2>
        <div className="recent-searches">
          {(stats.recentSearches || []).slice(0, 10).map((search, i) => (
            <div key={i} className="recent-search-item">
              <span className="search-query">{search.query}</span>
              <span className="search-meta">
                <span className={`intent-badge intent-${search.intent?.replace('-', '-')}`}>
                  {intentNames[search.intent] || search.intent}
                </span>
                <span className="search-duration">{(search.duration / 1000).toFixed(1)}s</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default Stats;
