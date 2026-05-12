/**
 * 搜索结果组件
 */

import './SearchResults.css';

function SearchResults({ results }) {
  if (!results || results.results.length === 0) {
    return (
      <div className="search-results empty">
        <p>没有找到相关结果</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <h2>搜索结果</h2>
        <span className="results-count">共 {results.count} 条</span>
      </div>

      <div className="results-list">
        {results.results.map((result) => (
          <div key={result.id} className="result-item">
            <h3 className="result-title">
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                {result.title}
              </a>
            </h3>
            <p className="result-snippet">{result.snippet}</p>
            <div className="result-meta">
              <span className="result-source">{result.source}</span>
              <span className="result-time">
                {new Date(result.timestamp).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchResults;
