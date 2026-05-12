/**
 * AI 搜索主应用 - 完整版
 * 功能：流式输出 + Markdown渲染 + 导出 + 分享
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamSearch } from './hooks/useStreamSearch';
import './styles/design.css';
import './styles/App.css';

function App() {
  const { t } = useTranslation();
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
        <h1>{t('home.title')}</h1>
        <p className="subtitle">{t('home.subtitle')}</p>
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
            placeholder={t('home.placeholder')}
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
            {loading ? (
              <span className="btn-content">
                <span className="spinner-small"></span>
                {t('search.searching')}
              </span>
            ) : (
              t('search.button')
            )}
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
              ⚠️ {t(error)}
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
              <h3>{t('activities.title')}</h3>
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
                <h2>{t('result.report_title')}</h2>
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
                    h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
                    p: ({ children }) => <p className="md-p">{children}</p>,
                    strong: ({ children }) => <strong className="md-strong">{children}</strong>,
                    ul: ({ children }) => <ul className="md-ul">{children}</ul>,
                    ol: ({ children }) => <ol className="md-ol">{children}</ol>,
                    li: ({ children }) => <li className="md-li">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
                    code: ({ inline, children }) =>
                      inline ? (
                        <code className="md-inline-code">{children}</code>
                      ) : (
                        <code className="md-code-block">{children}</code>
                      ),
                  }}
                >
                  {result.report}
                </ReactMarkdown>
              </div>
            </div>

            {result.findings?.length > 0 && (
              <div className="findings-section">
                <h2>{t('result.findings_title')}</h2>
                {result.findings.map((f, i) => (
                  <div key={i} className="finding-card">
                    <p className="finding-fact">{f.fact}</p>
                    <p className="finding-meta">
                      {t('result.source')}：{f.source} |
                      {t('result.confidence')}：
                      <span className={`confidence-${f.confidence}`}>
                        {t(`result.confidence_${f.confidence}`)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="duration-info">
              ⏱️ {t('search.duration', { seconds: ((result.duration || 0) / 1000).toFixed(1) })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== 导出按钮组件 =====
function ExportButton({ content, query }) {
  const { t } = useTranslation();

  const handleExport = () => {
    // 生成完整的 Markdown 文档
    const fullContent = `# ${query}\n\n${content}`;
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${query.slice(0, 30)}-研究报告.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.button
      className="icon-button"
      onClick={handleExport}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="导出 Markdown"
    >
      📥 {t('activities.export')}
    </motion.button>
  );
}

// ===== 澄清对话框组件（支持多选） =====
function ClarifyDialog({ question, options, onConfirm, onSkip, onCancel }) {
  const [selected, setSelected] = useState([]);

  const toggleOption = (option) => {
    setSelected(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const handleConfirm = () => {
    if (selected.length > 0) {
      onConfirm(selected);
    }
  };

  return (
    <motion.div
      className="clarify-box"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <h3>💭 {question}</h3>
      <p className="clarify-subtitle">可多选，或跳过直接搜索</p>

      <div className="clarify-options">
        {options?.map((option, i) => (
          <motion.button
            key={i}
            className={`clarify-option ${selected.includes(option) ? 'selected' : ''}`}
            onClick={() => toggleOption(option)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="checkbox-icon">
              {selected.includes(option) ? '☑️' : '⬜'}
            </span>
            {option}
          </motion.button>
        ))}
      </div>

      <div className="clarify-actions">
        <button
          onClick={handleConfirm}
          disabled={selected.length === 0}
          className="confirm-button"
        >
          确认选择 {selected.length > 0 && `(${selected.length})`}
        </button>
        <button onClick={onSkip} className="skip-button">
          跳过
        </button>
        <button onClick={onCancel} className="cancel-clarify-button">
          取消
        </button>
      </div>
    </motion.div>
  );
}

// ===== 分享按钮组件 =====
function ShareButton({ result, query }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // 生成分享数据
    const shareData = {
      q: query,
      r: result.report.slice(0, 500), // 限制长度
      t: Date.now()
    };

    // 简单编码
    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded.slice(0, 500)}`;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.button
      className={`icon-button ${copied ? 'copied' : ''}`}
      onClick={handleShare}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {copied ? `✅ ${t('activities.copied')}` : `🔗 ${t('activities.share')}`}
    </motion.button>
  );
}

export default App;
