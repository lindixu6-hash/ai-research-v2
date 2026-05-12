/**
 * 输入框组件 - AI输入样式
 */
import { motion } from 'framer-motion';
import { forwardRef } from 'react';

export const AIInput = forwardRef(({ className, ...props }, ref) => {
  return (
    <motion.input
      ref={ref}
      className={`ai-input ${className || ''}`}
      whileFocus={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      {...props}
    />
  );
});
