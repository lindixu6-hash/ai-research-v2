/**
 * AI 搜索主应用 - 优化版
 * 优化：组件拆分、错误边界、性能优化
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamSearch } from './hooks/useStreamSearch';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClarifyDialog } from './components/business/ClarifyDialog';
import { ExportButton } from './components/business/ExportButton';
import { ShareButton } from './components/business/ShareButton';
import './styles/design.css';
import './styles/App.css';

function AppContent() {
  const {
    query,
    setQuery,
    loading,
    activities,
    result,
    clarifyData,
    showClarify,
    feedbackMessage,
    error,
    executeSearch,
    cancelSearch,
    selectClarification,
    skipClarify
  } = useStreamSearch();

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="app">
      {/* 头部 */}
      <motion.header
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>🤖 AI 智能搜索</h1>
        <p className="subtitle">多轮搜索 + 智能分析 = 深度研究</p>
      </motion.header>

      {/* 搜索区域 */}
      <motion.div
        className="search-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className="search-form">
          <motion.input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入你想了解的问题..."
            disabled={loading}
            whileFocus={{ scale: 1.01 }}
          />
          <motion.button
            type="submit"
            className="search-button"
            disabled={loading || !query.trim()}
            whileHover={!loading && query.trim() ? { scale: 1.02 } : {}}
            whileTap={!loading && query.trim() ? { scale: 0.98 } : {}}
          >
            {loading ? '搜索中...' : '搜索'}
          </motion.button>
          {loading && (
            <motion.button
              type="button"
              className="cancel-button"
              onClick={cancelSearch}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
            >
              ✕
            </motion.button>
          )}
        </form>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              ⚠️ {error === 'error.empty_query' ? '请输入搜索问题' : '网络请求失败，请稍后重试'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 澄清问题 */}
        <AnimatePresence>
          {showClarify && clarifyData && (
            <ClarifyDialog
              question={clarifyData.question}
              options={clarifyData.options}
              onConfirm={selectClarification}
              onSkip={skipClarify}
              onCancel={() => setShowClarify(false)}
            />
          )}
        </AnimatePresence>

        {/* 反馈消息 */}
        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              className="feedback-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {feedbackMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 实时活动流 */}
      <AnimatePresence>
        {activities.length > 0 && (
          <motion.div
            className="activities-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="activities-header">
              <h3>📋 搜索进度</h3>
              {loading && <span className="pulse-dot"></span>}
            </div>
            <div className="activities-list">
              {activities.map((activity) => (
                <motion.div
                  key={activity.id}
                  className={`activity-item activity-${activity.type}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="activity-icon">{activity.icon}</span>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    {activity.details && (
                      <div className="activity-details">
                        {Array.isArray(activity.details) ? (
                          activity.details.map((item, i) => (
                            <div key={i} className="activity-detail-item">
                              {typeof item === 'string' ? item : item.title || item.url}
                            </div>
                          ))
                        ) : (
                          <span>{activity.details}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {activity.progress && (
                    <span className="activity-progress">{activity.progress}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搜索结果 */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className="result-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="report-section">
              <div className="report-header">
                <h2>📄 研究报告</h2>
                <div className="report-actions">
                  <ExportButton content={result.report} query={query} />
                  <ShareButton result={result} query={query} />
                </div>
              </div>

              {/* Markdown 渲染 */}
              <div className="report-content markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
                    h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
                    h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
                    p: ({ children }) => <p className="md-p">{children}</p>,
                    strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                    ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                    li: ({ children }) => <li className="md-li">{children}</li>,
                  }}
                >
                  {result.report}
                </ReactMarkdown>
              </div>
            </div>

            {result.findings?.length > 0 && (
              <div className="findings-section">
                <h2>💡 关键发现</h2>
                {result.findings.map((f, i) => (
                  <div key={i} className="finding-card">
                    <p className="finding-fact">{f.fact}</p>
                    <p className="finding-meta">
                      来源：{f.source} |
                      可信度：<span className={`confidence-${f.confidence}`}>
                        {f.confidence === 'high' ? '高' : f.confidence === 'medium' ? '中' : '低'}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="duration-info">
              ⏱️ 搜索耗时：{((result.duration || 0) / 1000).toFixed(1)} 秒
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 使用错误边界包裹整个应用
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
