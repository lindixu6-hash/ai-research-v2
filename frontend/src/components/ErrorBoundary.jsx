/**
 * 错误边界组件
 * 捕获子组件中的错误，防止整个应用崩溃
 */
import { Component } from 'react';
import PropTypes from 'prop-types';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>😔 出错了</h2>
            <p>页面遇到了一些问题</p>
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>错误信息</summary>
                <pre>{this.state.error?.toString()}</pre>
              </details>
            )}
            <button onClick={this.handleReset} className="retry-button">
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

export default ErrorBoundary;
