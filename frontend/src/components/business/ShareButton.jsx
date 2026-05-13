/**
 * 分享按钮组件
 * 功能：生成搜索结果分享链接
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

export function ShareButton({ result, query }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      q: query,
      r: result.report?.slice(0, 500) || '',
      t: Date.now()
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded.slice(0, 500)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <motion.button
      className={`icon-button ${copied ? 'copied' : ''}`}
      onClick={handleShare}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {copied ? '✅ 已复制' : '🔗 分享'}
    </motion.button>
  );
}
