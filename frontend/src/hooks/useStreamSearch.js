/**
 * 流式搜索 Hook
 * 使用 SSE 接收实时进度
 */
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = '/api';

export function useStreamSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [result, setResult] = useState(null);
  const [clarifyQuestions, setClarifyQuestions] = useState([]);
  const [clarifyData, setClarifyData] = useState(null);  // { question, options }
  const [showClarify, setShowClarify] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [error, setError] = useState('');

  const abortControllerRef = useRef(null);

  /**
   * 执行流式搜索
   */
  const executeSearch = useCallback(async (searchQuery, skipClarify = false) => {
    if (!searchQuery?.trim()) {
      setError('error.empty_query');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError('');
    setResult(null);
    setClarifyQuestions([]);
    setClarifyData(null);
    setShowClarify(false);
    setActivities([]);
    setFeedbackMessage('');

    try {
      const response = await fetch(`${API_BASE}/search/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Skip-Clarify': skipClarify ? 'true' : 'false'
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);
            handleSSEEvent(eventType, data);
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('搜索已取消');
      } else {
        console.error('搜索错误:', err);
        setError('error.network_error');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  /**
   * 选择澄清选项（支持多选）
   */
  const selectClarification = useCallback((selectedOptions) => {
    // 不修改 query，直接用原查询搜索
    setClarifyData(null);
    setShowClarify(false);

    // 显示反馈
    const optionsText = Array.isArray(selectedOptions)
      ? selectedOptions.join('、')
      : selectedOptions;
    setFeedbackMessage(`✅ 已选择"${optionsText}"，开始搜索...`);

    // 延迟后用原查询搜索（澄清答案通过参数传递）
    setTimeout(() => {
      executeSearchWithClarify(query, selectedOptions);
    }, 800);
  }, [query]);

  /**
   * 跳过澄清，直接搜索
   */
  const skipClarify = useCallback(() => {
    setClarifyData(null);
    setShowClarify(false);
    setFeedbackMessage('⏭️ 跳过澄清，直接搜索...');
    executeSearch(query, true);
  }, [query, executeSearch]);

  /**
   * 带澄清答案的搜索
   */
  const executeSearchWithClarify = useCallback(async (searchQuery, clarifyAnswers) => {
    if (!searchQuery?.trim()) {
      setError('error.empty_query');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError('');
    setResult(null);
    setClarifyData(null);
    setShowClarify(false);
    setActivities([]);
    setFeedbackMessage('');

    try {
      const answers = Array.isArray(clarifyAnswers) ? clarifyAnswers : [clarifyAnswers];
      const answersStr = encodeURIComponent(JSON.stringify(answers));
      const response = await fetch(`${API_BASE}/search/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Clarify-Answers': answersStr
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);
            handleSSEEvent(eventType, data);
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('搜索已取消');
      } else {
        console.error('搜索错误:', err);
        setError('error.network_error');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    query,
    setQuery,
    loading,
    activities,
    result,
    clarifyQuestions,
    clarifyData,
    showClarify,
    feedbackMessage,
    error,
    executeSearch,
    cancelSearch,
    selectClarification,
    skipClarify
  };

  function handleSSEEvent(eventType, data) {
    const addActivity = (activity) => {
      setActivities(prev => [...prev, {
        ...activity,
        id: Date.now() + Math.random(),
        timestamp: data.timestamp || Date.now()
      }]);
    };

    switch (eventType) {
      case 'start':
        setActivities([]);
        addActivity({ type: 'start', message: data.message, icon: '🚀' });
        break;

      case 'step':
        addActivity({
          type: 'step',
          step: data.step,
          message: data.message,
          icon: getStepIcon(data.step),
          progress: data.current ? `${data.current}/${data.total}` : null
        });
        break;

      case 'queries_generated':
        addActivity({
          type: 'info',
          message: data.message,
          details: data.queries,
          icon: '🔑'
        });
        break;

      case 'search_result':
        addActivity({
          type: 'search_result',
          message: `找到 ${data.count} 个结果`,
          details: data.results,
          icon: '📄'
        });
        break;

      case 'validation':
        addActivity({
          type: 'validation',
          message: data.message,
          icon: '✅',
          details: `有效: ${data.valid}/${data.total}`
        });
        break;

      case 'clarify':
        // 单问题渐进式澄清（不显示在活动流）
        if (data.question) {
          setClarifyData({
            question: data.question,
            options: data.options || []
          });
          setShowClarify(true);
        }
        break;

      case 'report':
        setResult({
          report: data.report,
          findings: data.findings,
          duration: data.duration
        });
        addActivity({ type: 'complete', message: '搜索完成！', icon: '🎉' });
        break;

      case 'error':
        setError(data.message);
        addActivity({ type: 'error', message: `❌ ${data.message}`, icon: '⚠️' });
        break;
    }
  }
}

function getStepIcon(step) {
  const icons = {
    clarify: '💡',
    generating_queries: '🔑',
    searching: '🔍',
    analyzing: '📊',
    generating_report: '📝',
    complete: '🎉'
  };
  return icons[step] || '⏳';
}
