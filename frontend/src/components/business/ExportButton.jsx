/**
 * 导出按钮组件
 * 功能：将搜索结果导出为 Markdown 文件
 */
import { motion } from 'framer-motion';

export function ExportButton({ content, query }) {
  const handleExport = () => {
    const fullContent = `# ${query}\n\n${content}`;
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${query.slice(0, 30).replace(/[<>:"/\\|?*]/g, '')}-研究报告.md`;
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
      📥 导出
    </motion.button>
  );
}
