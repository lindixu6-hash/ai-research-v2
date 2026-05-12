import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/design.css';  // 设计变量（必须先加载）
import './styles/App.css';      // 应用样式
import './i18n';                // 初始化国际化

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
