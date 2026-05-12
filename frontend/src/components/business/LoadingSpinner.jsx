/**
 * 加载动画组件 - DEV_GUIDE 动效规范
 * 用 Framer Motion 实现 pulse-soft 效果
 */
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function LoadingSpinner() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="loading-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      {/* 脉冲旋转的圆圈 */}
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />

      {/* 文字脉冲效果 */}
      <motion.p
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {t('search.loading_title')}
      </motion.p>

      <p className="loading-tips">{t('search.loading_tips')}</p>
    </motion.div>
  );
}
