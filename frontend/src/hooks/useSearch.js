/**
 * 搜索逻辑 Hook
 * 封装搜索状态和操作
 */
import { useState } from 'react';
import { search } from '../utils/api';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [clarifyQuestions, setClarifyQuestions] = useState([]);
  const [error, setError] = useState('');

  /**
   * 执行搜索
   */
  const executeSearch = async (searchQuery) => {
    if (!searchQuery?.trim()) {
      setError('error.empty_query');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setClarifyQuestions([]);

    try {
      const data = await search(searchQuery.trim());

      if (data.status === 'need_clarify') {
        setClarifyQuestions(data.questions);
      } else if (data.status === 'success') {
        setResult(data);
      } else {
        setError(data.message || 'error.server_error');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'error.network_error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 选择澄清问题
   */
  const selectClarification = (question) => {
    setQuery(prev => `${prev}。${question}`);
    setClarifyQuestions([]);
  };

  return {
    query,
    setQuery,
    loading,
    result,
    clarifyQuestions,
    error,
    executeSearch,
    selectClarification
  };
}
